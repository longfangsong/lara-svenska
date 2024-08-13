"use client";
import { useWavesurfer } from '@wavesurfer/react'
import { Button } from 'flowbite-react';
import { useMemo, useRef, useState } from 'react';
import { IoIosPause, IoIosPlay, IoIosSkipBackward, IoIosSkipForward } from 'react-icons/io';
import { TbArrowNarrowRight } from 'react-icons/tb';
import { TiArrowLoop } from 'react-icons/ti';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js';


function splitOnSilence(channelData: Float32Array, sampleRate: number, silenceThreshold = -30, minSilenceDuration = 500) {
    const silenceThresholdLinear = Math.pow(10, silenceThreshold / 20);
    const minSilenceSamples = sampleRate / 1000 * minSilenceDuration;

    let sentences = [];
    let state: "InSentence" | "DetectingSilence" | "InSilence" = "InSentence";
    let sentenceStart = 0;
    let silenceStart = 0;
    for (let i = 0; i < channelData.length; ++i) {
        const isSilence = Math.abs(channelData[i]) < silenceThresholdLinear;
        switch (state as "InSentence" | "DetectingSilence" | "InSilence") {
            case "InSentence":
                if (isSilence) {
                    state = "DetectingSilence";
                    silenceStart = i;
                }
                break;
            case "DetectingSilence":
                if (!isSilence) {
                    state = "InSentence";
                } else if (i - silenceStart > minSilenceSamples) {
                    state = "InSilence";
                }
                break;
            case "InSilence":
                if (!isSilence) {
                    state = "InSentence";
                    const silenceLength = i - silenceStart;
                    sentences.push([sentenceStart, i - silenceLength / 2]);
                    sentenceStart = i - silenceLength / 4;
                    silenceStart = 0;
                }
                break;
        }
    }
    sentences.push([sentenceStart, channelData.length]);
    return sentences;
}

export function Player({ url }: { url: string }) {
    const [regionLoop, setRegionLoop] = useState(false);
    // const [activeRegion, setActiveRegion] = useState<Region | null>(null);
    const containerRef = useRef(null);
    const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
        container: containerRef,
        height: 50,
        waveColor: 'rgb(200, 0, 200)',
        progressColor: 'rgb(100, 0, 100)',
        url,
        plugins: useMemo(() => [RegionsPlugin.create()], []),
    });
    wavesurfer?.on('decode', () => {
        const decoded = wavesurfer?.getDecodedData();
        const channelData = decoded?.getChannelData(0);
        const segments = splitOnSilence(channelData!, decoded!.sampleRate);
        const regionPlugin = wavesurfer?.getActivePlugins()[0] as RegionsPlugin;
        if (regionPlugin.getRegions().length === 0) {
            let loop = { loop: false };
            segments.forEach(([start, end], i) => {
                let color = "rgba( 51, 153, 204, 0.5)";
                if (i % 2 === 1) {
                    color = "rgba(153, 153, 204, 0.5)";
                }
                regionPlugin.addRegion({
                    start: start / decoded!.sampleRate,
                    end: end / decoded!.sampleRate,
                    color,
                    drag: false,
                    resize: false,
                });
            });
            regionPlugin.on('update-loop' as any, (value) => {
                loop.loop = value;
            });
            regionPlugin.on('region-clicked', (region, e) => {
                e.stopPropagation();
                region.play()
            });
            let activeRegion: Region | null = null;
            regionPlugin.on('region-in', (region) => {
                activeRegion = region;
            })
            regionPlugin.on('region-out', (region) => {
                if (activeRegion?.id === region.id) {
                    if (loop.loop) {
                        region.play();
                    }
                } else {
                    activeRegion = null;
                }
            });
        }
    });

    const onPlayPause = () => {
        wavesurfer && wavesurfer.playPause()
    }

    const lastSentence = () => {
        const regionPlugin = wavesurfer?.getActivePlugins()[0] as RegionsPlugin;
        const regions = regionPlugin.getRegions();
        const currentRegionIndex = regions.findIndex((region, index) => {
            if (index + 1 !== regions.length) {
                return region.start <= currentTime && currentTime < regions[index + 1].start;
            } else {
                return region.start <= currentTime;
            }
        });
        if (currentTime - regions[currentRegionIndex].start < 0.5) {
            if (currentRegionIndex && currentRegionIndex !== 0) {
                regions[currentRegionIndex - 1].play();
            }
        } else {
            regions[currentRegionIndex].play();
        }
    }

    const nextSentence = () => {
        const regionPlugin = wavesurfer?.getActivePlugins()[0] as RegionsPlugin;
        const regions = regionPlugin.getRegions(); const currentRegionIndex = regions.findIndex((region, index) => {
            if (index + 1 !== regions.length) {
                return region.start <= currentTime && currentTime < regions[index + 1].start;
            } else {
                return region.start <= currentTime;
            }
        });
        if (currentRegionIndex && currentRegionIndex + 1 < regions.length) {
            regions[currentRegionIndex + 1].play();
        }
    }

    return <>
        <div ref={containerRef} />
        <div className="flex flex-wrap gap-2">
            <Button onClick={onPlayPause} className='my-2 p-0'>
                {isPlaying ? <IoIosPause className="h-5 w-5" /> : <IoIosPlay className="h-5 w-5" />}
            </Button>
            <Button onClick={lastSentence} className='my-2 p-0'>
                <IoIosSkipBackward className="h-5 w-5" />
            </Button>
            <Button onClick={nextSentence} className='my-2 p-0'>
                <IoIosSkipForward className="h-5 w-5" />
            </Button>
            {
                regionLoop ?
                    <Button onClick={() => {
                        const regionPlugin: any = wavesurfer?.getActivePlugins()[0] as RegionsPlugin;
                        regionPlugin.emit('update-loop', false);
                        setRegionLoop(false);
                    }} className='my-2 p-0'>
                        <TbArrowNarrowRight className="h-5 w-5" />
                    </Button> :
                    <Button onClick={() => {
                        const regionPlugin: any = wavesurfer?.getActivePlugins()[0] as RegionsPlugin;
                        regionPlugin.emit('update-loop', true);
                        setRegionLoop(true);
                    }} className='my-2 p-0'>
                        <TiArrowLoop className="h-5 w-5" />
                    </Button>
            }
        </div>
    </>
}