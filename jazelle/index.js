// @flow
const {resolve} = require('path');
const {getRootDir} = require('./utils/get-root-dir.js');
const {parse} = require('./utils/parse-argv.js');
const {cli} = require('./utils/cli.js');
const {install} = require('./commands/install.js');
const {ci} = require('./commands/ci.js');
const {add} = require('./commands/add.js');
const {remove} = require('./commands/remove.js');
const {upgrade} = require('./commands/upgrade.js');
const {greenkeep} = require('./commands/greenkeep.js');
const {dedupe} = require('./commands/dedupe.js');
const {purge} = require('./commands/purge.js');
const {check} = require('./commands/check.js');
const {chunk} = require('./commands/chunk.js');
const {changes} = require('./commands/changes.js');
const {build} = require('./commands/build.js');
const {dev} = require('./commands/dev.js');
const {test} = require('./commands/test.js');
const {lint} = require('./commands/lint.js');
const {flow} = require('./commands/flow.js');
const {start} = require('./commands/start.js');
const {yarn} = require('./commands/yarn.js');
const {bazel} = require('./commands/bazel.js');
const {bump} = require('./commands/bump.js');
const {doctor} = require('./commands/doctor.js');
const {
  reportMismatchedTopLevelDeps,
} = require('./utils/report-mismatched-top-level-deps.js');
const {getChunkPattern} = require('./utils/get-chunk-pattern.js');
const {findChangedTargets} = require('./utils/find-changed-targets.js');
const {scaffold} = require('./utils/scaffold.js');
const {version} = require('./package.json');

/*::
export type RunCLI = (Array<string>) => Promise<void>;
*/
const runCLI /*: RunCLI */ = async argv => {
  const [command, ...rest] = argv;
  const args = parse(rest);
  args.cwd = args.cwd ? resolve(process.cwd(), args.cwd) : process.cwd();
  await cli(
    command,
    args,
    {
      version: [`Display the version number`, async () => console.log(version)],
      init: [
        `Scaffolds a workspace`,
        async () => scaffold({cwd: process.cwd()}), // actually runs from bin/cli.sh because it needs to generate Bazel files
      ],
      setup: [
        `Installs Jazelle hermetically`, // installation happens in bin/cli.sh, nothing to do here
        async () => {},
      ],
      install: [
        `Install all dependencies for a project, modifying lockfiles and Bazel BUILD files if necessary

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => install({root: await rootOf(args), cwd}),
      ],
      ci: [
        `Install all dependencies for a project without modifying source files

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => ci({root: await rootOf(args), cwd}),
      ],
      add: [
        `Install a package and any packages that it depends on

        [name]                  Package to add at a specific version. ie., foo@1.2.3
        --dev                   Whether to install as devDependency
        --cwd [cwd]             Project directory to use`,
        async ({cwd, name, dev}) =>
          add({root: await rootOf(args), cwd, name, dev: Boolean(dev)}), // FIXME all args can technically be boolean, but we don't want Flow complaining about it everywhere
      ],
      remove: [
        `Remove a package

        [name]                  Package to remove
        --cwd [cwd]             Project directory to use`,
        async ({cwd, name}) => remove({root: await rootOf(args), cwd, name}),
      ],
      upgrade: [
        `Upgrade a package version

        [name]                  Package to add
        --version [version]     Version
        --cwd [cwd]             Project directory to use`,
        async ({cwd, name, version}) =>
          upgrade({root: await rootOf(args), cwd, name, version}),
      ],
      greenkeep: [
        `Upgrade a package version across all projects

        [name]                  Package to add
        --version [version]     Version
        --from [from]           If current version satisfies this semver range. Optional`,
        async ({name, version, from}) =>
          greenkeep({root: await rootOf(args), name, version, from}),
      ],
      dedupe: [
        `Dedupe transitive deps across all projects`,
        async () => dedupe({root: await rootOf(args)}),
      ],
      purge: [
        `Remove generated files (i.e. node_modules folders and bazel output files)`,
        async () => purge({root: await rootOf(args)}),
      ],
      check: [
        `Display deps w/ multiple versions installed across projects`,
        async () => check({root: await rootOf(args)}),
      ],
      chunk: [
        `Print a glob pattern representing a chunk of a set of files

        --patterns [patterns]   Glob patterns, separated by |
        --jobs [count]          Total number of chunks to divide files into
        --index [index]         Which chunk to display`,
        async ({patterns, jobs, index}) =>
          chunk({root: await rootOf(args), patterns, jobs, index}),
      ],
      changes: [
        `Lists Bazel test targets that changed given a list of changed files

        [files]                 A file containing a list of changed files (one per line)
        --type [type]           'bazel' or 'dirs'`,
        async ({name, type}) =>
          changes({root: await rootOf(args), files: name, type}),
      ],
      build: [
        `Build a project

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => build({root: await rootOf(args), cwd}),
      ],
      dev: [
        `Run a project

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => dev({root: await rootOf(args), cwd}),
      ],
      test: [
        `Test a project

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => test({root: await rootOf(args), cwd, args: rest}),
      ],
      lint: [
        `Lint a project

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => lint({root: await rootOf(args), cwd}),
      ],
      flow: [
        `Typecheck a project

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => flow({root: await rootOf(args), cwd}),
      ],
      start: [
        `Run a project

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => start({root: await rootOf(args), cwd}),
      ],
      bazel: [
        `Run a Bazel command

        [args...]               A space separated list of arguments`,
        async ({cwd}) => bazel({root: await rootOf(args), args: rest}),
      ],
      yarn: [
        `Runs a Yarn command

        [name]                  A yarn command name
        [args...]               A space separated list of arguments
        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => yarn({cwd, args: rest}),
      ],
      bump: [
        `Bump version for the specified package, plus changed dependencies

        [type]                  major, premajor, minor, preminor, patch, prepatch, prerelease or none
        --frozenPackageJson     If true, throws if changes to package.json are required
        --cwd [cwd]             Project directory to use`,
        async ({cwd, name: type, frozenPackageJson: frozen}) =>
          bump({
            root: await rootOf(args),
            cwd,
            type,
            frozenPackageJson: Boolean(frozen),
          }),
      ],
      doctor: [
        `Provides advice for some types of issues

        --cwd [cwd]             Project directory to use`,
        async ({cwd}) => doctor({root: await rootOf(args), cwd}),
      ],
    },
    async () => {}
  );
};

async function rootOf(args) {
  return getRootDir({dir: args.cwd});
}

module.exports = {
  runCLI,
  version,
  scaffold,
  install,
  ci,
  add,
  remove,
  upgrade,
  greenkeep,
  dedupe,
  purge,
  check: reportMismatchedTopLevelDeps,
  chunk: getChunkPattern,
  changes: findChangedTargets,
  build,
  dev,
  test,
  lint,
  flow,
  start,
  bazel,
  yarn,
  bump,
  doctor,
  getRootDir,
};
