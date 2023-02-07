import {Component, createEffect, onMount, Show} from "solid-js";
import { useForm } from './validation';
import {state, setState} from "./state";
import Hls from "hls.js";

onMount(() => {
   createEffect((prevState) => {
       if (prevState && prevState !== state.streamProvider) {
           const formElem = document.getElementById('stream-handler') as HTMLFormElement;
           formElem.reset();
           const provider = document.getElementById('stream_provider') as HTMLSelectElement;
           provider.value = state.streamProvider;
       }
       return state.streamProvider;
   })
});


const ErrorMessage = (props) => <span class="md:col-start-2 error-message text-red-500">{props.error}</span>;

const StreamConfig: Component = () => {
    const { validate, formSubmit } = useForm({
        errorClass: "error-input"
    });
    const fn = () => {
        const isFormNotValid = Object.keys(state.formValidations).some(input => !!state.formValidations[input]);
        if (!isFormNotValid) {
            setState({streamProvider: state.streamProvider, streamConfig: state.streamConfig, canStartPlay: true});
        }
    };
    const configureStreaming = (event) => {
        const streamInfo = event.target.value;
        setState({streamProvider: state.streamProvider, streamConfig: streamInfo, canStartPlay: state.canStartPlay, formValidations: state.formValidations});
    }

    const detectWebRTC = () => {
        const browserAgents = ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection', 'RTCIceGatherer'];
        return browserAgents.some(item => item in window);
    }

    const detectHls = (): boolean => {
        const videoElem = document.createElement('video');
        return (videoElem.canPlayType('application/vnd.apple.mpegurl') || Hls.isSupported()) as boolean;
    };

    return (
        <div>
            <div class="px-4 verflow-hidden shadow rounded-md bg-white grid grid-cols-1">
                <div class="my-5">
                    <p class="text-2xl">Can Support WebRTC: <span id="webrtc-detector"
                                                                      class="font-bold">{detectWebRTC() ? 'Detected' : 'Not Detected'}</span></p>
                </div>
                <div class="my-5">
                    <p class="text-2xl">Can Support HLS: <span id="hls-detector" class="font-bold">
                        {detectHls() ? 'Detected' : 'Not Detected'}
                    </span>
                    </p>
                </div>
                <form use:formSubmit={fn} id="stream-handler" name="stream-handler">
                    <div class="my-5 grid grid-cols-1 border-emerald-200 border-4 border-double rounded p-5">
                        <div class="grid md:grid-cols-4 grid-cols-1 mb-5 grid-cols-6">
                            <p class="md:col-start-2 md:col-span-2  col-start-3 col-span-3 font-bold text-lg text-gray-700">Streaming
                                Configuration</p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3">
                            <label for="stream_provider" class="text-md font-medium text-black">Streaming
                                Provider</label>
                            <select onChange={({target}) => setState({streamProvider: target.value, streamConfig: null, canStartPlay: false, formValidations: {}})} required  use:validate id="stream_provider" name="stream_provider"
                                    class="md:col-span-2 block w-full rounded-md border border-gray-300 bg-white  shadow-sm" class={state.formValidations.stream_provider ? 'focus:ring-red-500 focus:border-red-500 border-red-500' : 'focus:ring-indigo-500 focus:border-indigo-500'}>
                                <option disabled selected value="">Choose an streaming provider</option>
                                <option value="wowza">Wowza Cloud</option>
                                <option value="tencent">Tencent</option>
                                <option value="hls">HLS</option>
                            </select>
                            {state.formValidations.stream_provider && <ErrorMessage error={state.formValidations.stream_provider} />}
                        </div>
                        <Show when={state.streamProvider === 'wowza'}>
                           <div class="grid grid-cols-1 md:grid-cols-3 mt-5">
                               <label for="wowza_rtc" class="ext-md font-medium text-black">Stream ID</label>
                               <input required type="text" placeholder="Stream Key" name="wowza_rtc" id="wowza_rtc"
                                      use:validate
                                      disabled={state.playerPlaying}
                                      onInput={configureStreaming}
                                      class="laceholder:italic placeholder:text-slate-400 md:col-span-2 rounded-md border-gray-300 shadow-sm"
                                      class={state.formValidations.wowza_rtc ? 'focus:ring-red-500 focus:border-red-500 border-red-500' : 'focus:ring-indigo-500 focus:border-indigo-500'}/>
                               {state.formValidations.wowza_rtc && <ErrorMessage error={state.formValidations.wowza_rtc}/>}
                           </div>
                        </Show>
                        <Show when={state.streamProvider === 'hls'}>
                            <div class="grid grid-cols-1 md:grid-cols-3 mt-5">
                                <label for="hls_info" class="ext-md font-medium text-black">Playback URL</label>
                                <input use:validate
                                       required type="text"
                                       placeholder="URL"
                                       name="hls_info"
                                       disabled={state.playerPlaying}
                                       id="hls_info"
                                       onInput={configureStreaming}
                                       class="
                                       laceholder:italic
                                       placeholder:text-slate-400
                                       md:col-span-2
                                       rounded-md border-gray-300
                                       shadow-sm
                                       disabled:bg-slate-50
                                       disabled:text-slate-500
                                       disabled:border-slate-200
                                       disabled:shadow-none"
                                       class={state.formValidations.hls_info ? 'focus:ring-red-500 focus:border-red-500 border-red-500' : 'focus:ring-indigo-500 focus:border-indigo-500'}/>
                                {state.formValidations.hls_info && <ErrorMessage error={state.formValidations.hls_info}/>}
                            </div>
                        </Show>
                        <Show when={state.streamProvider === 'tencent'}>
                            <div class="grid grid-cols-1 md:grid-cols-3 mt-5">
                                <label htmlFor="tencent_rtc" class="ext-md font-medium text-black">Tencent Playback
                                    URL</label>
                                <input use:validate required type="text" placeholder="URL" name="tencent_rtc"
                                       id="tencent_rtc"
                                       onInput={configureStreaming}
                                       disabled={state.playerPlaying}
                                       class="laceholder:italic placeholder:text-slate-400 md:col-span-2 rounded-md border-gray-300 shadow-sm"
                                       class={state.formValidations.tencent_rtc ? 'focus:ring-red-500 focus:border-red-500 border-red-500' : 'focus:ring-indigo-500 focus:border-indigo-500'}/>
                                {state.formValidations.tencent_rtc && <ErrorMessage error={state.formValidations.tencent_rtc}/>}
                            </div>
                        </Show>
                        <div class="grid md:grid-cols-4 grid-cols-6 mt-5">
                            <button type="submit"
                                    class="md:col-start-2 col-start-3 col-span-2 md:col-span-1 rounded-lg bg-teal-300 py-1 active:border-indigo-500 border-2 hover:text-rose-400 hover:font-bold">Play
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default StreamConfig;
