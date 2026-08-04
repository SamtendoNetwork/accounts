module.exports = {

	apps: [

		{

			name: 'account',

			script: './dist/server.js', // adjust if your build output differs

			cwd: '/opt/account',

			env: {

				NODE_ENV: 'production',

				PORT: 7070

			},

			restart_delay: 3000,

			max_restarts: 10,

			watch: false

		}

	]

};
