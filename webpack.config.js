const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'popup.js',
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
      template: './src/popup.html',
      filename: 'popup.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './manifest.json', to: 'manifest.json' },
        { from: './_locales', to: '_locales' },
        { from: './css', to: 'css' },
        { from: './img', to: 'img' },
        { from: './js/background.js', to: 'js/background.js' },
        { from: './rules.json', to: 'rules.json' },
      ],
    }),
  ],
}; 