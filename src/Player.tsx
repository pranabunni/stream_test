import {Component, createEffect, createSignal, onMount} from "solid-js";
import {setState, state} from "./state";
import '@flowplayer/player/flowplayer.css';
import './player.css';
import flowplayer from '@flowplayer/player';
import  HlsPlugin from '@flowplayer/player/plugins/hls';
import ID3Plugin from '@flowplayer/player/plugins/id3';
import FasPlugin from '@flowplayer/player/plugins/fas';
import { Director, View } from '@wowzamediasystems/sdk-rts'

flowplayer(HlsPlugin, ID3Plugin, FasPlugin);

const Player: Component = () => {
    let player = null;
    let playerElem;
    let tencent = null;
    let tencentWebRTCTimeStamp = null;
    const [timeStamp, setTimeStamp] = createSignal('');
    let canSupportID3 = false;
    let wowzaRTCTimeStamp = null;


    onMount(() => {
        createEffect((prevState) => {
            if (prevState && prevState !== state.streamProvider) {
                if (player) {
                   player.destroy();
                }
                if (playerElem) {
                    playerElem.innerHTML = '';
                    playerElem.setAttribute('class', '');
                }
            }
            if (state.canStartPlay) {
                configurePlayer();
                switch (state.streamProvider) {
                    case 'wowza':
                        configureWowzaStreaming(state.streamConfig);
                        break;
                    case 'tencent':
                        configureTencentStreaming(state.streamConfig);
                        break;
                    default:
                        configureHlsStreaming(state.streamConfig);
                        break;
                }
            }
            return state.streamProvider;
        });

        const configurePlayer = () => {
            player =  flowplayer("#player", {
                token: "eyJraWQiOiJqU2F2VFJTV3VLbmsiLCJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJjIjoie1wiYWNsXCI6NCxcImlkXCI6XCJqU2F2VFJTV3VLbmtcIn0iLCJpc3MiOiJGbG93cGxheWVyIn0.Wr3gFSQFnRkmbHH2DmQEEuKbNBqkviHMhmvel0v9XQYOjor9R6Mp_NmrpR0KTSHUiFTaTNy7F6aOfQxTt8HDoQ",
                autoplay: true,
                muted: true,
                live: true,
                seekable: false,
            });
            player.on('reap', () => {
                console.log('flowplayer destroyed');
                tencent = null;
                player = null;
                setTimeStamp('');
                canSupportID3 = false;
                tencentWebRTCTimeStamp = null;
                wowzaRTCTimeStamp = null;
                setState('playerPlaying', () => false);
            });

            player.on('playing', () => {
                setState('playerPlaying', () => true);
            });

            player.on('error', (error) => {
                console.log('flowplayer error', error)
            });

            player.on('timeupdate', () => {
                if (player) {
                    if (state.streamProvider === 'hls') {
                        if(player.hls && player.hls.latency && !canSupportID3) {
                            const currentTime = new Date();
                            const latency = Math.ceil(player.hls.latency);
                            currentTime.setSeconds(currentTime.getSeconds() - latency);
                            setTimeStamp(currentTime.toUTCString());
                        } else if ('getStartDate' in player && !isNaN(player.getStartDate()) && !canSupportID3) {
                            const playerStartTime = player.getStartDate();
                            playerStartTime.setSeconds(playerStartTime.getSeconds() + player.currentTime);
                            setTimeStamp(playerStartTime.toUTCString());
                        }
                    } else if(tencentWebRTCTimeStamp) {
                        setTimeStamp(tencentWebRTCTimeStamp.toUTCString());
                    } else if(wowzaRTCTimeStamp) {
                        setTimeStamp(wowzaRTCTimeStamp.toUTCString());
                    }
                }
            });
        }
    });


    const configureWowzaStreaming = (streamName: string) => {

        let fps = [];
        //Define callback for generate new token
        const tokenGenerator = () => Director.getSubscriber({streamName, streamAccountId: ''});

        //Create a new instance
        const wowzaView = new View(streamName, tokenGenerator, player);

        //Start connection to publisher
        wowzaView.connect().then(() => {
            if (wowzaView.webRTCPeer) {
                wowzaView.webRTCPeer.initStats();
                //Capture new stats from event every second
                wowzaView.webRTCPeer.on('stats', (stats) => {
                    if (stats.video && stats.video.inbounds && stats.video.inbounds.length) {
                        const frag = stats.video.inbounds[0];
                        if (frag && frag.framesPerSecond && frag.framesPerSecond < 24 && fps.length < 60) {
                            fps.push(frag.framesPerSecond);
                        } else {
                            fps = [];
                        }
                    }
                    if (fps.length === 60) {
                        alert('please turn off the low latency stream for now.')
                    } else if (stats.raw) {
                        stats.raw.forEach((report) => {
                            if ('timestamp' in report) {
                                wowzaRTCTimeStamp = new Date(report.timestamp);
                                const currentTime = new Date();
                                const  currentDiff = (currentTime.getTime() - wowzaRTCTimeStamp.getTime()) / 1000;
                                // if tencent webRTC latency is higher than 4 secs then relay on timestamp
                                if (currentDiff > 3) {
                                    alert('greater than 4 secs need to relay on slide sync timestamps');
                                }
                            }
                        });
                    }
                });
            }
        }).catch(err => console.log('wowza webrtc connect error'));
    }

    const configureTencentStreaming = (webRtcURL) => {

        tencent = TCPlayer(player, {
            language: 'en',
            muted: true,
            controlBar: false,
        });
        let fps = [];
        tencent.on('webrtcstats', ({data: {timestamp, video: {framesPerSecond}}}) => {

            // minimum fps for playing a video with realistic motion is 24
            if (framesPerSecond && framesPerSecond < 24 && fps.length < 60) {
                fps = [...fps, framesPerSecond];
            } else {
                fps = []; // reset the array in case the video having an at least fps of greater than 24
            }

            if (fps.length === 60) {
                alert('Having trouble to play the video. Please reload the page again.');
            } else if (timestamp) {
                tencentWebRTCTimeStamp = new Date(timestamp);
                const currentTime = new Date();
                const  currentDiff = (currentTime.getTime() - tencentWebRTCTimeStamp.getTime()) / 1000;
                // if tencent webRTC latency is higher than 4 secs then relay on timestamp
                if (currentDiff > 3) {
                    alert('greater than 4 secs need to relay on slide sync timestamps');
                }
            }
        });
        tencent.on('error', (err) => {
            console.log('tencent player error', err);
        });
        tencent.src(webRtcURL);
    }

    const configureHlsStreaming = (playbackURL) => {
        let fps = [];
        player.on('ID3', ({data}) => {
            const UtcRegex = /^([1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(0[0-9]|1[0-9]|2[0-4]):(5[0-9]|[0-4]\d):(5[0-9]|[0-4]\d)$)/;
            const iosRegex = /^([1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(0[0-9]|1[0-9]|2[0-4]):(5[0-9]|[0-4]\d):(5[0-9]|[0-4]\d)([Zz])$)/
            const UtcMilliSecsRegex = /^([1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(0[0-9]|1[0-9]|2[0-4]):(5[0-9]|[0-4]\d):(5[0-9]|[0-4]\d):(\d{3})$)/;
            const IsoMilliSecsRegex = /^([1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(0[0-9]|1[0-9]|2[0-4]):(5[0-9]|[0-4]\d):(5[0-9]|[0-4]\d):(\d{3}[Zz]|\d{3})$)/;
            if (data.cue.value && data.cue.value.info && data.cue.value.info === 'programDateTime' && data.cue.value.data) {
                canSupportID3 = true;
                setTimeStamp(new Date(data.cue.value.data).toUTCString())
            } else if (UtcRegex.test(data.cue.value.data) || UtcMilliSecsRegex.test(data.cue.value.data)) {
                canSupportID3 = true;
                const dateString = data.cue.value.data + 'Z';
                setTimeStamp(new Date(dateString).toUTCString());
            } else if (iosRegex.test(data.cue.value.data) || IsoMilliSecsRegex.test(data.cue.value.data)) {
                setTimeStamp(new Date(data.cue.value.data).toUTCString());
            }
        });

        player.on('loadeddata', () => {
            console.log('loaded first frame');
            if (player.hls) {

                //Fired when ID3 parsing is completed
                player.hls.on('hlsFragParsingMetadata', (id, data) => {
                    if (data.frag && data.frag.programDateTime && !canSupportID3) {
                        let dateTime = data.frag.programDateTime;
                        let date = new Date(dateTime);
                        setTimeStamp(date.toUTCString());
                    }
                });

                player.hls.on('hlsFpsDrop', (id, data) => {
                    console.log('frames dropped', data);
                });
            }
        });

        player.on('timeupdate', () => {
            if (player && player.fas) {
                if (player.fas.frame_rate && player.fas.frame_rate < 24 && fps.length < 60) {
                    fps.push(player.fas.frame_rate);
                } else {
                    fps = [];
                }
            }
            if (fps.length === 60) {
                alert('Having trouble to play the video. Please reload the page again.');
            }
        });
       player.setSrc(playbackURL);
    };
    return (
        <div
            class="px-4 verflow-hidden shadow rounded-md bg-white grid grid-rows-2 grid-flow-col min-h-fit">
            <div class="my-5 row-end-1">
                <p class="text-2xl">Timestamp: <span id="player-timestamp" class="font-bold">{timeStamp()}</span></p>
            </div>
            <div class="my-5 row-start-1 row-span-2">
                <div id="player" ref={playerElem}></div>
            </div>
        </div>
    )
}
export default Player;
