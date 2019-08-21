echo "steps:"
echo "  - wait"

# Get the change set
SHA1="$(git rev-parse HEAD)"
SHA2="$(git rev-parse origin/master)"
git diff-tree --no-commit-id --name-only -r $SHA1 $SHA2 > changes.txt
CHANGES=$(jazelle changes ./changes.txt)

for DIR in $CHANGES ; do (
  PROJECT=$(basename "$DIR");
  if [ -d "$DIR" ] && [ $PROJECT != "common" ] && [ $PROJECT != "scripts" ] && [ $PROJECT != "flow-typed" ] && [ $PROJECT != "rfcs" ] && [ $PROJECT != "docs" ]; then
    if [ $PROJECT = "fusion-cli" ]; then
      echo "  - label: 'fusion-cli'";
      echo "    commands:";
      echo "    - 'cd fusion-cli'";
      echo "    - 'jazelle ci'";
      echo "    - 'jazelle build'";
      echo "    - '.buildkite/nodeTests'";
      echo "    parallelism: 10";
      echo "    timeout_in_minutes: 10";
      echo "    plugins:";
      echo "      'docker-compose#v3.0.0':";
      echo "        run: ci";
      echo "    agents:";
      echo "      queue: workers";
    else
      echo "  - label: '$PROJECT'";
      echo "    commands:";
      echo "    - 'cd $DIR'";
      echo "    - 'jazelle ci'";
      echo "    - 'jazelle build'";
      echo "    - 'jazelle test'";
      echo "    - 'jazelle lint'";
      echo "    - 'jazelle flow'";
      echo "    timeout_in_minutes: 10";
      echo "    plugins:";
      echo "      'docker-compose#v3.0.0':";
      echo "        run: ci";
      echo "    agents:";
      echo "      queue: workers";
    fi;
  fi;
); done;
