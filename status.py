#!/usr/bin/env python

import os
import os.path
import sys
from pkg_resources import parse_version
import json


arches = [
  {'name': 'debian-armel', 'branch_type': 'debian', 'arch': 'armel'},
  {'name': 'debian-armhf', 'branch_type': 'debian', 'arch': 'armhf'},
  {'name': 'raspbian', 'branch_type': 'raspbian', 'arch': 'armhf'}
]

def get_branch_official_version(branch):
	files = os.listdir('ceph.com/%(branch)s/pool/main/c/ceph'%{'branch': branch})
	dscs = [x for x in files if x.endswith('.dsc')]
	sorted_dscs = list(sorted((l.strip() for l in dscs), key=parse_version))
	dscname = sorted_dscs[-1]
	version = dscname[5:-4]
	return version


def parse_package_file(packagefile):
	packages = {}
	try:
		with open(packagefile, 'r') as fileinput:
			data = {}
			last = None
			for line in fileinput:
				line = line.strip()
				# blank line
				if len(line) == 0:
					if 'Package' in data:
						packages[data['Package']] = data
					data = {}
					last = None
					continue

				if line[0] != ' ' and ':' in line:
					key, value = line.split(':', 1)
					key = key.strip()
					value = value.strip()
					data[key] = value
					lastkey = key
				if line[0] == ' ':
					data[lastkey] = data[lastkey] + '\n' + line
			if 'Package' in data:	# catch final block
				packages[data['Package']] = data
				data = {}
	except IOError:
		pass
	return packages


def get_branch_posted_versions(branch):
	posted = {}
	for archdata in arches:
		arch = archdata['arch']
		branch_type = archdata['branch_type']
		realbranch = branch.replace('debian', branch_type)
		branchdir = 'repo/%(branch)s'%{'branch': realbranch}
		distdir = os.path.join(branchdir, 'dists')
		pooldir = os.path.join(branchdir, 'pool', 'main', 'c', 'ceph')
		dists = os.listdir(distdir)
		dists = [x for x in dists if os.path.isdir(os.path.join(distdir, x))]
		for dist in dists:
			packagefile = os.path.join(distdir, dist, 'main',
			                           'binary-'+arch, 'Packages')
			packages = parse_package_file(packagefile)
			if 'ceph' in packages:
				full_version = packages['ceph']['Version']
				version = full_version.split('~')[0]
				posted[branch_type] = posted.get(branch_type, {})
				posted[branch_type][dist] = posted[branch_type].get(dist, {})
				posted[branch_type][dist][arch] = version
	return posted


def get_building_version():
	try:
		with open(os.path.join('build', 'build.json'), 'r') as input:
			return json.load(input)
	except IOError:
		pass
	return None


def get_build_log(version, arch):
	filename = 'ceph_%(version)s_%(arch)s'%{'version': version, 'arch': arch}
	logs = os.listdir(os.path.join('repo', 'logs'))
	version_logs = [x for x in logs if x.startswith(filename)]
	version_logs = list(sorted(version_logs))
	if len(version_logs) > 0:
		return 'logs/' + version_logs[0]  # url join
	return None


def get_build_logs():
	logs = {}
	for archdata in arches:
		arch = archdata['arch']
		branch_type = archdata['branch_type']
		logs[branch_type] = logs.get(branch_type, {})
		
		branch_dir = os.path.join('dist', branch_type)
		contents = os.listdir(branch_dir)
		versions = [x for x in contents if os.path.isdir(os.path.join(branch_dir, x))]
		for version in versions:
			dist = 'wheezy'
			logs[branch_type][dist] = logs[branch_type].get(dist, {})
			logs[branch_type][dist][version] = logs[branch_type][dist].get(version, {})
			built_dir = os.path.join(branch_dir, version, arch)
			if os.path.isdir(built_dir):
				logs[branch_type][dist][version][arch] = ''
				files = os.listdir(built_dir)
				mainpacks = [x for x in files if x.startswith('ceph_') and x.endswith('.deb')]
				if len(mainpacks) > 0:
					mainpack = mainpacks[0]
					filename = mainpack[5:-4]
					logversion, arch = filename.split('_')
					version = logversion.split('~')[0]

					logarch = arch
					if branch_type == 'raspbian':
						logarch = 'raspbian'
					logs[branch_type][dist][version][arch] = get_build_log(logversion, logarch)
	return logs


data = {}
data['building'] = get_building_version()
data['build_logs'] = get_build_logs()
data['branches'] = {}
branches = [x for x in os.listdir('ceph.com/') if x.startswith('debian')]
for branch in branches:
	data['branches'][branch] = data.get(branch, {})
	data['branches'][branch]['version'] = get_branch_official_version(branch)
	data['branches'][branch]['posted'] = get_branch_posted_versions(branch)
json.dump(data, sys.stdout, sort_keys=True, separators=(',', ':'), indent=4)
