#!/usr/bin/env python3
"""
Startup script for Research Gap Pipeline Backend
"""

import subprocess
import sys
import os
from pathlib import Path

def check_requirements():
    """Check if required packages are installed"""
    try:
        import fastapi
        import uvicorn
        import aiohttp
        import sqlite3
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("Please run: pip install -r requirements.txt")
        return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting Research Gap Pipeline Backend...")
    print("📍 API will be available at: http://localhost:8000")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🔄 Server will reload automatically on code changes")
    print("\n" + "="*50 + "\n")
    
    # Change to src directory and start server
    os.chdir("src")
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "api:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    print("Research Gap Pipeline - Backend Startup")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("src/api.py").exists():
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Start server
    start_server()