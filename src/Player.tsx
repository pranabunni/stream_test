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
    let tencentJerkyFrames = [];
    let tencentPacketsLoss = [];
    let wowzaMediaTracks = [];
    let wowzaJerkyFramesList = [];
    let wowzaPacketsLostList = [];
    let wowzaView;

    const wowzaTimeUpdate = (stats) => {

        console.log('stats', stats);
        // rtt not available immediately after the first load
        if ('currentRoundTripTime' in stats) {
            const videoTrack = stats?.video?.inbounds[0] || null;
            const audioTracks = stats?.audio?.inbounds[0] || null;

            // ensure video FPS is available
            // sometime stats APi wil fire even when player got stopped
            if (videoTrack && audioTracks && (videoTrack.framesPerSecond || videoTrack.bitrate)) {
                if (wowzaJerkyFramesList.length >= 60) {
                    alert('video is jerky');
                    return;
                } else if (videoTrack.framesPerSecond < 20) {
                    wowzaJerkyFramesList.push(videoTrack.framesPerSecond);
                } else {
                    wowzaJerkyFramesList = [];
                    const plr = audioTracks.totalPacketsLost/(audioTracks.totalPacketsLost + audioTracks.totalPacketsReceived) * 100;

                    if (wowzaPacketsLostList.length >= 60) {
                        alert('video is jerky');
                        return;
                    }
                    if (plr >= 2) {
                        wowzaPacketsLostList.push(plr);
                    } else {
                        wowzaPacketsLostList = [];
                    }

                    /**
                     * the stats api not providing a correct bitrate for the video tracks
                     */
                    const bitrate = +(audioTracks.bitrate / 1000).toFixed(0);
                    const jitter = videoTrack.jitter;
                    const rttp = stats.currentRoundTripTime || 100;

                    console.log('plr', plr);
                    console.log('jittr', jitter);
                    console.log('rttp', rttp);
                    console.log('bitrate', bitrate);

                    if (rttp > 100 && jitter > 50) {
                        alert('network related issues');
                    } else {
                        wowzaRTCTimeStamp = new Date(audioTracks.timestamp);
                        const currentTime = new Date();
                        const  currentDiff = (currentTime.getTime() - wowzaRTCTimeStamp.getTime()) / 1000;
                        // if latency is higher than 4 secs then relay on timestamp
                        if (currentDiff > 3) {
                            alert('greater than 4 secs need to relay on slide sync timestamps');
                        }
                    }
                }
            } else {
                alert('video is not playing');
            }
        }
    };

    const wowzaMediaTracker = (event) => {
        if (event) {
            // player.srcObject = event.streams[0];
            event.track.onunmute = (res) => {
                if (res.target.kind === 'video' || res.target.kind === 'audio') {
                    wowzaMediaTracks.push(res.target);
                }
            };
        }
    };

    const tencentTimeUpdate = ({data}) => {
        console.log('stats', data);
        const videoTrack = data?.video;
        const audioTrack = data?.audio;

        if (videoTrack.frameHeight && videoTrack.frameWidth) {
            if (videoTrack.bitrate || videoTrack.framesPerSecond) {
                if (tencentJerkyFrames.length >=60) {
                    alert('choppy video');
                    return;
                }
                if ( videoTrack['framesPerSecond'] < 20) {
                    tencentJerkyFrames.push(videoTrack['framesPerSecond']);
                } else {
                    tencentJerkyFrames = [];
                }
                const bitrate = +(videoTrack['bitrate'] / 1000).toFixed(0);
                const plr = audioTrack['packetsLost'] / (audioTrack['packetsLost'] + audioTrack['packetsReceived']) * 100;

                if (tencentPacketsLoss.length > 60) {
                    alert('video is jerky');
                    return;
                }

                if (plr > 2) {
                    tencentPacketsLoss.push(plr);
                } else {
                    tencentPacketsLoss = [];
                }

                /**
                 * getting higher jitter even when the stream haven't much latency
                 */
                const jitter = audioTrack['jitterBufferDelay'] || 10;
                console.log('bit', bitrate);
                console.log('plr', plr);
                console.log('jitter', jitter);

                if (bitrate < 450) {
                    alert('poor video quality');
                } else {
                    tencentWebRTCTimeStamp = new Date(data?.timestamp);
                    const currentTime = new Date();
                    const  currentDiff = (currentTime.getTime() - tencentWebRTCTimeStamp.getTime()) / 1000;
                    // if tencent webRTC latency is higher than 4 secs then relay on timestamp
                    if (currentDiff > 3) {
                        alert('greater than 4 secs need to relay on slide sync timestamps');
                        return;
                    }
                }
            }
        }
    };
    const tencentErrorhandler = (err) => {
        console.log('tencent player error', err);
    };

    onMount(() => {
        createEffect((prevState) => {
            if (prevState && prevState !== state.streamProvider) {
                if (player) {
                   player.destroy();
                   if (prevState === 'tencent') {
                     //  tencent.off('webrtcstats', tencentTimeUpdate);
                       tencent = null;
                       tencentWebRTCTimeStamp = null;
                       tencentJerkyFrames = [];
                       tencentPacketsLoss = [];
                       setTimeStamp('');
                   }
                   if (prevState === 'wowza') {
                       wowzaView.webRTCPeer.off('stats', wowzaTimeUpdate);
                       wowzaView.off('track', wowzaMediaTracker);
                   }
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
                console.log('player destroyed');
                player = null;
                tencent = null;
                tencentWebRTCTimeStamp = null;

                tencentJerkyFrames = [];
                tencentPacketsLoss = [];

                wowzaMediaTracks = [];
                wowzaPacketsLostList = [];
                wowzaJerkyFramesList = [];

                setTimeStamp('');
                canSupportID3 = false;
                wowzaRTCTimeStamp = null;

                setState('playerPlaying', () => false);
            });

            player.on('playing', () => {
                setState('playerPlaying', () => true);
            });

            player.on('volumechange', () => {
                if (tencent) {
                    tencent.muted(player.muted);
                }
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
        //Define callback for generate new token
        const tokenGenerator = () => Director.getSubscriber({streamName, streamAccountId: ''});

        //Create a new instance
        wowzaView = new View(streamName, tokenGenerator, player);

        // Set track event handler to receive streams from Publisher.
        wowzaView.on('track', wowzaMediaTracker);

        player.on('loadeddata', () => {
            if (wowzaMediaTracks.length !== 2) {
                alert('video/audio tracks are not loaded correctly');
            }
        });

        //Start connection to publisher
        wowzaView.connect().then(() => {
            if (wowzaView.webRTCPeer) {
                wowzaView.webRTCPeer.initStats();
                //Capture new stats from event every second
                wowzaView.webRTCPeer.on('stats', wowzaTimeUpdate);
            }
        }).catch(err => console.log('wowza webrtc connect error', err));
    }

    const configureTencentStreaming = (webRtcURL) => {

        tencent = TCPlayer(player, {
            language: 'en',
            muted: true,
            controlBar: false,
            autoplay: true,
        });

        tencent.on('webrtcstats', tencentTimeUpdate);
        tencent.on('play', () => {
            const loadingElem = document.querySelector('.fp-wait');
            if (loadingElem) {
                loadingElem.parentNode.removeChild(loadingElem);
            }
        });

        tencent.on('error', tencentErrorhandler);
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
