import {createStore} from "solid-js/store";

const [state, setState] = createStore({
    streamProvider: null,
    streamConfig: null,
    canStartPlay: false,
    hlsSupport: false,
    webrtcSupport: false,
    formValidations: {},
    playerPlaying: false
});

export {state, setState};
