"""
Data masking utilities for protecting sensitive information.
Used to mask emails, phone numbers, and other PII for users without VIEW_FULL_LEADS permission.
"""

import re
from typing import Dict, Any, List


def mask_email(email: str) -> str:
    """
    Mask email address while keeping first and last characters visible.
    
    Examples:
        dikshant@gmail.com -> dikXXXXXshant@gmail.com
        john.doe@example.com -> johnXXXXXdoe@example.com
        a@b.com -> aXXXXXa@b.com
    
    Args:
        email: Email address to mask
        
    Returns:
        Masked email address
    """
    if not email or '@' not in email:
        return email
    
    try:
        local, domain = email.split('@', 1)
        
        if len(local) <= 2:
            # Very short local part, mask middle character
            masked_local = local[0] + 'X' * max(1, len(local) - 1)
        else:
            # Keep first 3 and last 4 characters, mask the rest
            prefix_len = min(3, len(local) // 3)
            suffix_len = min(4, len(local) // 3)
            
            prefix = local[:prefix_len]
            suffix = local[-suffix_len:]
            mask_length = max(5, len(local) - prefix_len - suffix_len)
            
            masked_local = f"{prefix}{'X' * mask_length}{suffix}"
        
        return f"{masked_local}@{domain}"
    except Exception:
        # If any error, return original email
        return email


def mask_phone(phone: str) -> str:
    """
    Mask phone number while keeping first 3 and last 3 digits visible.
    
    Examples:
        1234567890 -> 123XXXX890
        +1 (555) 123-4567 -> +1 (555) 1XX-XX67
        555-1234 -> 555-XX34
    
    Args:
        phone: Phone number to mask
        
    Returns:
        Masked phone number
    """
    if not phone:
        return phone
    
    try:
        # Extract only digits
        digits = re.sub(r'\D', '', phone)
        
        if len(digits) <= 6:
            # Too short, mask middle
            return phone[:2] + 'X' * (len(phone) - 4) + phone[-2:] if len(phone) > 4 else 'XXXX'
        
        # Keep first 3 and last 3 digits
        prefix = digits[:3]
        suffix = digits[-3:]
        mask_length = len(digits) - 6
        
        masked_digits = f"{prefix}{'X' * mask_length}{suffix}"
        
        # Try to preserve original formatting
        result = phone
        digit_index = 0
        for i, char in enumerate(phone):
            if char.isdigit():
                if digit_index < len(masked_digits):
                    result = result[:i] + masked_digits[digit_index] + result[i+1:]
                    digit_index += 1
        
        return result
    except Exception:
        # If any error, return masked version
        return 'XXX-XXXX'


def mask_field(field_name: str, value: Any) -> Any:
    """
    Mask a field based on its name and type.
    
    Args:
        field_name: Name of the field
        value: Value to potentially mask
        
    Returns:
        Masked value or original value
    """
    if value is None:
        return value
    
    field_lower = field_name.lower()
    
    # Email fields
    if 'email' in field_lower:
        return mask_email(str(value))
    
    # Phone fields
    if 'phone' in field_lower or 'mobile' in field_lower or 'tel' in field_lower:
        return mask_phone(str(value))
    
    # SSN or sensitive ID fields
    if 'ssn' in field_lower or 'social_security' in field_lower:
        return 'XXX-XX-' + str(value)[-4:] if len(str(value)) >= 4 else 'XXX-XX-XXXX'
    
    # Credit card fields
    if 'card' in field_lower or 'credit' in field_lower:
        return 'XXXX-XXXX-XXXX-' + str(value)[-4:] if len(str(value)) >= 4 else 'XXXX'
    
    # Address fields - partial masking
    if 'address' in field_lower or 'street' in field_lower:
        addr_str = str(value)
        if len(addr_str) > 10:
            return addr_str[:5] + 'X' * (len(addr_str) - 10) + addr_str[-5:]
        return 'XXXXX'
    
    # Default: return original value
    return value


def mask_lead_data(lead_data: Dict[str, Any], mask_fields: List[str] = None) -> Dict[str, Any]:
    """
    Mask sensitive fields in lead data.
    
    Args:
        lead_data: Lead data dictionary
        mask_fields: Optional list of specific fields to mask. If None, auto-detect.
        
    Returns:
        Lead data with masked sensitive fields
    """
    if not lead_data:
        return lead_data
    
    masked_data = lead_data.copy()
    
    # Default sensitive fields to always mask
    default_mask_fields = ['email', 'phone', 'mobile', 'telephone', 'ssn', 'social_security_number']
    
    fields_to_mask = mask_fields if mask_fields else default_mask_fields
    
    # Mask specified fields
    for field in fields_to_mask:
        if field in masked_data:
            masked_data[field] = mask_field(field, masked_data[field])
    
    # Auto-detect and mask other sensitive fields
    for key, value in masked_data.items():
        if key not in fields_to_mask:
            # Check if field name suggests it's sensitive
            if any(sensitive in key.lower() for sensitive in ['email', 'phone', 'ssn', 'card', 'address']):
                masked_data[key] = mask_field(key, value)
    
    return masked_data


def should_mask_data(user_role: str, user_permissions: List[str]) -> bool:
    """
    Determine if data should be masked for a user.
    
    Args:
        user_role: User's role
        user_permissions: User's custom permissions
        
    Returns:
        True if data should be masked, False if user can see full data
    """
    from app.core.roles import can_view_full_data
    return not can_view_full_data(user_role, user_permissions)
