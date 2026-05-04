#!/usr/bin/env python3
"""
Generate cryptographically secure secrets for .env file.
Usage: python scripts/generate_secrets.py
"""
import secrets


def main():
    print("=" * 60)
    print("Add these to your .env file:")
    print("=" * 60)
    print()
    print(f"JWT_SECRET={secrets.token_urlsafe(48)}")
    print(f"INTERNAL_API_KEY={secrets.token_urlsafe(32)}")
    print()
    print("=" * 60)
    print("⚠️  Save these securely. NEVER commit .env to git.")
    print("=" * 60)


if __name__ == "__main__":
    main()
