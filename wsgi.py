# PythonAnywhere WSGI configuration
import sys
import os

# Add your project directory to sys.path
path = '/home/yourusername/tube-soundboard'
if path not in sys.path:
    sys.path.append(path)

from main import app as application

if __name__ == "__main__":
    application.run()
