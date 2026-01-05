import os
import json
import firebase_admin
from firebase_admin import auth, credentials

# Initialize Firebase Admin SDK
_firebase_app = None


def _get_credentials():
    """Get Firebase credentials from environment variable.

    Supports two formats:
    - File path: /path/to/serviceAccountKey.json
    - JSON content: {"type": "service_account", ...}
    """
    key = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if not key:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set")

    if key.strip().startswith("{"):
        # JSON content directly
        return credentials.Certificate(json.loads(key))
    else:
        # File path
        return credentials.Certificate(key)


def initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized."""
    global _firebase_app
    if _firebase_app is None:
        cred = _get_credentials()
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def verify_token(token: str) -> dict:
    """Verify a Firebase ID token and return the decoded claims.

    Args:
        token: The Firebase ID token to verify

    Returns:
        Decoded token claims including 'uid', 'email', 'name', 'picture', etc.

    Raises:
        firebase_admin.auth.InvalidIdTokenError: If token is invalid
        firebase_admin.auth.ExpiredIdTokenError: If token has expired
        firebase_admin.auth.RevokedIdTokenError: If token has been revoked
    """
    initialize_firebase()
    return auth.verify_id_token(token)
