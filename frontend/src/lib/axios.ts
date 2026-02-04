import axios from "axios";

// Create an instance of axio
const api = axios.create({
    // Fallback to relative path "/api/v1" which works with Nginx proxy in production
    baseURL: (function () {
        let url = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
        // If running in browser and on HTTPS, ensure API URL is also HTTPS
        if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http://")) {
            url = url.replace("http://", "https://");
        }
        return url;
    })(),
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Important for HttpOnly cookies
});

// Request interceptor to attach access token if we have it in memory/storage
// Since we are using HttpOnly cookies for refresh tokens, we might store
// access token in memory or localStorage. The user prompt asked for access/refresh keys.
// Usually access token is put in Authorization header.
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for refreshing token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't already retried, AND it's not an authentication endpoint
        const isAuthEndpoint = originalRequest.url?.includes("/auth/login") ||
            originalRequest.url?.includes("/auth/refresh") ||
            originalRequest.url?.includes("/auth/clear-session");

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isAuthEndpoint
        ) {
            originalRequest._retry = true;

            try {
                // Attempt to refresh token using the HttpOnly cookie
                const res = await api.post("/auth/refresh"); // Use 'api' instance to keep baseURL
                const { access_token } = res.data;

                localStorage.setItem("accessToken", access_token);
                api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout user
                localStorage.removeItem("accessToken");

                // Only redirect to login if we're not already on an auth page
                if (typeof window !== "undefined") {
                    const publicPaths = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"];
                    const isAuthPage = publicPaths.some(path => window.location.pathname.startsWith(path));

                    if (!isAuthPage) {
                        window.location.href = "/login";
                    }
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
