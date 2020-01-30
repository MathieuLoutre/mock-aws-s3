/*
 * grunt-aws-s3
 * https://github.com/MathieuLoutre/mock-aws-s3
 *
 * Copyright (c) 2013 Mathieu Triay
 * Licensed under the MIT license.
 */

'use strict'

module.exports = function (grunt) {
	// Project configuration.
	grunt.initConfig({
		jshint: {
			all: [
				'Gruntfile.js',
				'lib/*.js',
				'test/*.js'
			],
			options: {
				jshintrc: '.jshintrc'
			}
		},
		mochaTest: {
			test: {
				options: {
					reporter: 'spec'
				},
				src: ['test/test.js']
			},
			testDefaultOptions: {
				options: {
					reporter: 'spec'
				},
				src: ['test/testDefaultOptions.js']
			},
			testDefaultOptionsAndBasePath: {
				options: {
					reporter: 'spec'
				},
				src: ['test/testDefaultOptionsBasePath.js']
			},
			testBasePath: {
				options: {
					reporter: 'spec'
				},
				src: ['test/testBasePath.js']
			}

		},
		clean: {
			test: ['test/local/**']
		},
		copy: {
			main: {
				files: [
					{ expand: true, cwd: 'test/fixtures/', src: ['**'], dest: 'test/local' }
				]
			}
		}
	})

	grunt.loadNpmTasks('grunt-contrib-jshint')
	grunt.loadNpmTasks('grunt-mocha-test')
	grunt.loadNpmTasks('grunt-contrib-clean')
	grunt.loadNpmTasks('grunt-contrib-copy')

	// By default, lint and run all tests.
	grunt.registerTask('lint', 'jshint')
	grunt.registerTask('default', ['clean', 'copy', 'mochaTest:test', 'clean', 'copy', 'mochaTest:testDefaultOptions', 'clean', 'copy', 'mochaTest:testBasePath', 'clean', 'copy', 'mochaTest:testDefaultOptionsAndBasePath'])
}
