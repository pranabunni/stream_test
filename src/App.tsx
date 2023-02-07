import type { Component } from 'solid-js';
import StreamConfiguration from './StreamConfig';
import Player from './Player';
import {Match, Switch} from "solid-js";
import {useScript} from "solid-use-script";

const App: Component = () => {
    const [txPlayer, txPlayerError] = useScript('tencent/TXLivePlayer.min.js');
    const [tcPlayer, tcPlayerError] = useScript('tencent/tcplayer.min.js');
        return (
          <div class="bg-gray-200 min-h-screen overflow-hidden">
              <div class="m-5 mt-10">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <StreamConfiguration />
                      <Switch fallback={<Player></Player>}>
                          <Match when={txPlayer()}></Match>
                          <Match when={tcPlayer()}></Match>
                      </Switch>
                  </div>
              </div>
          </div>
        );
};

export default App;
