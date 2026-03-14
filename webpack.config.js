const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

function createConfig(target) {
  return {
    name: target,
    entry: {
      popup: path.resolve(__dirname, 'src/index.js'),
      background: path.resolve(__dirname, `src/background/${target}.js`),
    },
    output: {
      path: path.resolve(__dirname, 'dist', target),
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/popup.html'),
        filename: 'popup.html',
        chunks: ['popup'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, `targets/${target}/manifest.json`),
            to: 'manifest.json',
          },
          {
            from: path.resolve(__dirname, '_locales'),
            to: '_locales',
          },
          {
            from: path.resolve(__dirname, 'rules.json'),
            to: 'rules.json',
          },
          {
            from: path.resolve(__dirname, 'src/assets'),
            to: 'assets',
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
    performance: {
      hints: false,
    },
  };
}

module.exports = [createConfig('chrome'), createConfig('firefox')];