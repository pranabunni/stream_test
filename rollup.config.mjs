import commonjs from '@rollup/plugin-commonjs';

export default {
    input: ['src/tencent/tcplayer.min.js', 'src/tencent/TXLivePlayer.min.js'],
    output: {
        dir: 'assets',
        format: 'cjs'
    },
    plugins: [commonjs()]
};
