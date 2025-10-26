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
        
        # Python environment with venv support
        python = pkgs.python311;
        
        # Node.js environment for the web app
        nodeEnv = pkgs.nodejs_20;
        
        # Create a proper Python environment
        pythonEnv = pkgs.python311.buildEnv.override {
          extraLibs = [];
        };
        
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            python
            python.pkgs.pip
            python.pkgs.setuptools
            python.pkgs.virtualenv
            nodeEnv
            pkgs.ruff
            pkgs.stdenv.cc.cc.lib
            pkgs.glibc
            pkgs.zlib
          ];
          
          LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib:${pkgs.glibc}/lib:${pkgs.zlib}/lib:$LD_LIBRARY_PATH";
          
          shellHook = ''
            # Create a virtual environment if it doesn't exist
            if [ ! -d ".venv" ]; then
              ${python}/bin/python -m venv .venv
            fi
            
            # Activate the virtual environment
            source .venv/bin/activate
            
            echo "Daily Tarot Development Environment"
            echo "Python: $(python --version)"
            echo "Node.js: $(node --version)"
            echo ""
            echo "Setup commands:"
            echo "  pip install -r apps/pipeline/requirements.txt  - Install Python dependencies"
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
            ${python}/bin/python -m daily_tarot_pipeline.cli "$@"
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
