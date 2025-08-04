#!/bin/bash

# GitHub CLI Installation Script
# Run with: sudo bash install-gh.sh

set -e  # Exit on error

echo "Installing GitHub CLI..."

# Create keyrings directory
mkdir -p -m 755 /etc/apt/keyrings

# Download and add GPG key
echo "Adding GitHub CLI GPG key..."
wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null

# Set proper permissions
chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg

# Add GitHub CLI repository (fixed single line format)
echo "Adding GitHub CLI repository..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list

# Update package list
echo "Updating package list..."
apt update

# Install GitHub CLI
echo "Installing gh..."
apt install gh -y

echo "GitHub CLI installation complete!"
gh --version