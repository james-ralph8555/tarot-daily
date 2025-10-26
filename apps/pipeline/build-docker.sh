#!/usr/bin/env bash
set -euo pipefail

# Build the Docker image using Nix
echo "Building Docker image with Nix..."
nix-build '<nixpkgs>' -A dockerTools.buildImage -I nixos-config=./Dockerfile.nix --argstr system x86_64-linux

# Load the image into Docker
echo "Loading image into Docker..."
docker load -i result

# Tag the image
echo "Tagging image..."
docker tag docker-image:latest daily-tarot-pipeline:latest

echo "Docker image built and tagged as daily-tarot-pipeline:latest"