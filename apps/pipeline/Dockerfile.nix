{ pkgs ? import <nixpkgs> {} }:

let
  pythonEnv = pkgs.python311.withPackages (ps: with ps; [
    # Core dependencies
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
  
  # Create the tarot-pipeline script
  tarotPipeline = pkgs.writeShellScriptBin "tarot-pipeline" ''
    export PYTHONPATH="/app/src:$PYTHONPATH"
    exec ${pythonEnv}/bin/python -m daily_tarot_pipeline.cli "$@"
  '';
  
in
pkgs.dockerTools.buildImage {
  name = "daily-tarot-pipeline";
  tag = "latest";
  
  copyToRoot = pkgs.buildEnv {
    name = "image-root";
    paths = [
      pythonEnv
      tarotPipeline
      pkgs.stdenv.cc.cc.lib
      pkgs.glibc
      pkgs.zlib
    ];
    pathsToLink = [ "/bin" "/lib" ];
  };
  
  config = {
    Cmd = [ "tarot-pipeline" "nightly" ];
    WorkingDir = "/app";
    Env = [
      "PYTHONPATH=/app/src"
      "LD_LIBRARY_PATH=/lib"
    ];
  };
}