# Use the official prompts.chat base image
FROM ghcr.io/f/prompts.chat:latest

# --- Custom Logo Setup ---
# Copy ffff.svg from your repo root to the app's public directory
COPY ffff.svg /data/app/public/logo.svg

# --- Basic System Configuration ---
# These are safe to keep as defaults, but can be overridden by .env
ENV PORT=3000
EXPOSE 3000

# The base image handles the startup (Supervisor, Next.js, and Postgres)
# All PCHAT_ and AUTH_ variables will be read from the environment at runtime.
