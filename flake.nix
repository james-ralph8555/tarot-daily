{
  description = "Daily Tarot - AI-powered tarot reading application";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Python environment with all dependencies
        pythonEnv = pkgs.python311.withPackages (ps: with ps; [
          # Core dependencies from pyproject.toml
          dspy-ai
          duckdb
          python-dotenv
          typer
          pydantic
          rich
          pandas
          
          # Development dependencies
          pytest
          pytest-asyncio
        ]);
        
        # Node.js environment for the web app
        nodeEnv = pkgs.nodejs_20;
        
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pythonEnv
            nodeEnv
            pkgs.ruff
            pkgs.stdenv.cc.cc.lib
            pkgs.glibc
            pkgs.zlib
          ];
          
          shellHook = ''
            echo "Daily Tarot Development Environment"
            echo "Python: $(python --version)"
            echo "Node.js: $(node --version)"
            echo ""
            echo "Available commands:"
            echo "  tarot-pipeline    - Run the tarot pipeline CLI"
            echo "  npm install        - Install web app dependencies"
            echo "  npm run build      - Build the web app"
            echo "  npm run test       - Run web app tests"
            echo ""
          '';
        };

        # Package for the tarot pipeline
        packages.tarot-pipeline = pkgs.writeShellApplication {
          name = "tarot-pipeline";
          text = ''
            export PYTHONPATH="${./apps/pipeline/src}:$PYTHONPATH"
            ${pythonEnv}/bin/python -m daily_tarot_pipeline.cli "$@"
          '';
        };
        
        # Default package is the tarot pipeline
        packages.default = self.packages.${system}.tarot-pipeline;
        
        # Development app for running the pipeline
        apps.tarot-pipeline = {
          type = "app";
          program = "${self.packages.${system}.tarot-pipeline}/bin/tarot-pipeline";
        };
        
        apps.default = self.apps.${system}.tarot-pipeline;
      });
}
