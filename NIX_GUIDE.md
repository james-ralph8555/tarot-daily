# Nix Development Guide

This guide explains how to use Nix for development and deployment of the Daily Tarot project.

## Prerequisites

- [Nix](https://nixos.org/download.html) with flakes enabled
- [Docker](https://www.docker.com/) (optional, for container builds)

## Development Environment

### Setting up the environment

```bash
# Enter the Nix development shell
nix develop
```

This will:
- Create a Python virtual environment in `.venv/` if it doesn't exist
- Activate the virtual environment
- Provide Python 3.11, Node.js 20, and development tools

### Python Dependencies

All Python dependencies are automatically provided by the Nix environment. No manual installation required.

### Running the tarot pipeline

```bash
# Inside the Nix shell
tarot-pipeline --help
tarot-pipeline nightly
```

### Web app development

```bash
# Inside the Nix shell
cd apps/web
npm install
npm run build
npm run test
```

## Building Docker Images

### Using Nix (recommended)

```bash
cd apps/pipeline
./build-docker.sh
```

This builds a reproducible Docker image using Nix, which:
- Uses exact versions of all dependencies
- Creates a minimal, secure container
- Ensures reproducible builds

### Traditional Docker build (deprecated)

The old Dockerfile is kept for reference but should not be used:
```bash
# Not recommended - use Nix build instead
docker build -t daily-tarot-pipeline .
```

## Repository Guidelines

### Build, Test, and Development Commands

Always enter the Nix shell before running Python: `nix develop` for an interactive session or prefix commands with `nix develop --command …`.

### NEVER RUN THE DEV SERVER

NEVER RUN npm dev

## Nix Shell Features

The Nix shell provides:
- Python 3.11 with pip and setuptools
- Node.js 20
- Virtual environment support
- ruff for linting
- Required system libraries (libstdc++, glibc, zlib)

## Troubleshooting

### Import errors with shared libraries

If you encounter errors like `libstdc++.so.6: cannot open shared object file`, ensure you're using the Nix shell:
```bash
nix develop  # This sets up LD_LIBRARY_PATH correctly
```

### Virtual environment issues

The Nix shell automatically creates and activates a virtual environment at `.venv/`. If you have issues:
```bash
rm -rf .venv
nix develop  # This will recreate it
```

## Flake Outputs

The flake.nix defines:
- `devShells.default` - Development environment with all tools
- `packages.tarot-pipeline` - The tarot-pipeline CLI application
- `apps.tarot-pipeline` - Runnable application definition