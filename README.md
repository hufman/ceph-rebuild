This is a collection of scripts to rebuild Ceph Debian packages for other variants of Debian. I personally needed it to be rebuilt for ARM, but it should be easy to expand it to other architectures.

First, the build-schroot scripts much be run to initially create the sbuild/schroot system to host the compilation. These scripts rely on qemu-user-static being installed, to enable emulation of the target machine.

Next, you should set up the Debian repository that will hold the packages. You must have a GPG key for the scripts to use when signing the packages and the repository. This key id must be set in build-latest-version and repo/*/conf/distributions. The name of the key must be updated in update_changelog.

Then, the build-latest-version script should run. It will download the list of packages from ceph.com/debian, pick the latest package, download its sourcecode, do any necessary patches, compile the software, and add it to a reprepro-managed Debian repository.
