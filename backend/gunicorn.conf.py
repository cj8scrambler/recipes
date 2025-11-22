"""
Gunicorn configuration file for production deployment of Recipes application.

Usage:
    gunicorn -c gunicorn.conf.py app:app
"""

import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# Restart workers after this many requests, to help limit memory leaks
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
# Set loglevel via environment variable for debugging (default: info, debug for more verbose)
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "recipes-backend"

# Server mechanics
daemon = False
pidfile = None
user = None
group = None
tmp_upload_dir = None

# SSL (if needed - typically handled by reverse proxy)
# keyfile = None
# certfile = None

# Environment variables
raw_env = [
    # Add any additional environment variables here if needed
]

# Startup/shutdown hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    print(f"Starting Recipes Backend Server with {workers} workers...")


def when_ready(server):
    """Called just after the server is started."""
    print("Server is ready. Accepting connections.")


def on_exit(server):
    """Called just before exiting."""
    print("Shutting down Recipes Backend Server...")
