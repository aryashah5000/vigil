import { useState, useEffect, useRef, useCallback } from 'react'
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'

const BLENDSHAPE_NAMES = {
  eyeBlinkLeft: 'eyeBlinkLeft',
  eyeBlinkRight: 'eyeBlinkRight',
  eyeLookDownLeft: 'eyeLookDownLeft',
  eyeLookDownRight: 'eyeLookDownRight',
  eyeLookUpLeft: 'eyeLookUpLeft',
  eyeLookUpRight: 'eyeLookUpRight',
  eyeLookInLeft: 'eyeLookInLeft',
  eyeLookInRight: 'eyeLookInRight',
  eyeLookOutLeft: 'eyeLookOutLeft',
  eyeLookOutRight: 'eyeLookOutRight',
  jawOpen: 'jawOpen',
}

function getBlendshapeValue(blendshapes, name) {
  if (!blendshapes || !blendshapes[0]?.categories) return 0
  const shape = blendshapes[0].categories.find(c => c.categoryName === name)
  return shape?.score ?? 0
}

function computeEngagement(result) {
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    return { engagement: 0, focus: 0, faceDetected: false }
  }

  const blendshapes = result.faceBlendshapes

  const blinkL = getBlendshapeValue(blendshapes, BLENDSHAPE_NAMES.eyeBlinkLeft)
  const blinkR = getBlendshapeValue(blendshapes, BLENDSHAPE_NAMES.eyeBlinkRight)

  const eyeOpenness = 1 - (blinkL + blinkR) / 2

  const lookDownL = getBlendshapeValue(blendshapes, BLENDSHAPE_NAMES.eyeLookDownLeft)
  const lookDownR = getBlendshapeValue(blendshapes, BLENDSHAPE_NAMES.eyeLookDownRight)
  const lookOutL = getBlendshapeValue(blendshapes, BLENDSHAPE_NAMES.eyeLookOutLeft)
  const lookOutR = getBlendshapeValue(blendshapes, BLENDSHAPE_NAMES.eyeLookOutRight)

  const lookAway = Math.max(lookDownL, lookDownR, lookOutL, lookOutR)
  const gazeScore = Math.max(0, 1 - lookAway * 1.5)

  const landmarks = result.faceLandmarks[0]
  const noseTip = landmarks[1]   // nose tip landmark
  const chin = landmarks[152]    // chin landmark
  const forehead = landmarks[10] // forehead landmark

  const faceCenterX = noseTip.x
  const xDeviation = Math.abs(faceCenterX - 0.5) // 0 = perfectly centered
  const headFacingScore = Math.max(0, 1 - xDeviation * 3)

  const faceHeight = Math.abs(forehead.y - chin.y)

  const headTiltScore = Math.min(1, faceHeight / 0.25)

  const engagement = Math.max(0, Math.min(1,
    eyeOpenness * 0.45 + headFacingScore * 0.35 + headTiltScore * 0.2
  ))

  const focus = Math.max(0, Math.min(1,
    gazeScore * 0.5 + eyeOpenness * 0.3 + headFacingScore * 0.2
  ))

  return { engagement, focus, faceDetected: true }
}

export function useAttention() {
  const [isReady, setIsReady] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const [liveMetrics, setLiveMetrics] = useState({
    engagement: 0,
    focus: 0,
    stress: 0,
    heartRate: 0,
    faceDetected: false,
  })

  const itemMetricsRef = useRef({})
  const sessionRef = useRef(null)
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const animFrameRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function initMediaPipe() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        })

        if (!cancelled) {
          landmarkerRef.current = faceLandmarker
          setIsReady(true)
        }
      } catch (e) {
        console.error('MediaPipe FaceLandmarker init failed:', e)
        if (!cancelled) {
          setError('Failed to initialize face tracking. Check your connection.')
          setIsReady(true) // Still allow usage (will fall back gracefully)
        }
      }
    }

    initMediaPipe()
    return () => { cancelled = true }
  }, [])

  const startSession = useCallback(async (videoElement) => {
    videoRef.current = videoElement

    if (landmarkerRef.current && videoElement) {
      setIsActive(true)

      let lastTimestamp = -1

      const detectFrame = () => {
        if (!videoRef.current || !landmarkerRef.current) return
        const video = videoRef.current

        if (video.readyState >= 2 && video.currentTime !== lastTimestamp) {
          lastTimestamp = video.currentTime
          try {
            const result = landmarkerRef.current.detectForVideo(video, performance.now())
            const metrics = computeEngagement(result)

            setLiveMetrics(prev => ({
              engagement: metrics.engagement,
              focus: metrics.focus,
              stress: prev.stress, // not tracked by MediaPipe
              heartRate: prev.heartRate, // not tracked by MediaPipe
              faceDetected: metrics.faceDetected,
            }))
          } catch (e) {

          }
        }

        animFrameRef.current = requestAnimationFrame(detectFrame)
      }

      animFrameRef.current = requestAnimationFrame(detectFrame)
      sessionRef.current = { type: 'mediapipe' }
    } else {
      console.warn('FaceLandmarker not ready or no video element, starting demo mode')
      startDemoMode()
    }
  }, [])

  const startDemoMode = useCallback(() => {
    setIsActive(true)

    const demoState = {
      engagementTarget: 0.5,
      focusTarget: 0.45,
      phaseTimer: 0,
      phaseDuration: Math.floor(Math.random() * 12) + 6,
    }

    const interval = setInterval(() => {
      demoState.phaseTimer++

      if (demoState.phaseTimer >= demoState.phaseDuration) {
        demoState.phaseTimer = 0
        demoState.phaseDuration = Math.floor(Math.random() * 12) + 6

        const roll = Math.random()
        if (roll < 0.3) {
          demoState.engagementTarget = 0.1 + Math.random() * 0.2
          demoState.focusTarget = 0.1 + Math.random() * 0.2
        } else if (roll < 0.6) {
          demoState.engagementTarget = 0.4 + Math.random() * 0.25
          demoState.focusTarget = 0.35 + Math.random() * 0.25
        } else {
          demoState.engagementTarget = 0.7 + Math.random() * 0.25
          demoState.focusTarget = 0.65 + Math.random() * 0.25
        }
      }

      setLiveMetrics(prev => {
        const lerp = 0.15
        const noise = () => (Math.random() - 0.5) * 0.08
        const engagement = Math.max(0, Math.min(1,
          prev.engagement + (demoState.engagementTarget - prev.engagement) * lerp + noise()
        ))
        const focus = Math.max(0, Math.min(1,
          prev.focus + (demoState.focusTarget - prev.focus) * lerp + noise()
        ))

        return {
          engagement,
          focus,
          stress: Math.max(0, Math.min(1, 0.3 + (Math.random() - 0.5) * 0.2)),
          heartRate: Math.round(68 + Math.random() * 15),
          faceDetected: engagement > 0.25 ? Math.random() > 0.05 : Math.random() > 0.5,
        }
      })
    }, 500)

    sessionRef.current = { type: 'demo', _demoInterval: interval }
  }, [])

  const stopSession = useCallback(async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (sessionRef.current) {
      if (sessionRef.current._demoInterval) {
        clearInterval(sessionRef.current._demoInterval)
      }
      sessionRef.current = null
    }
    setIsActive(false)
  }, [])

  const startTrackingItem = useCallback((itemIndex) => {
    itemMetricsRef.current[itemIndex] = {
      readings: [],
      startTime: Date.now(),
    }
  }, [])

  const stopTrackingItem = useCallback((itemIndex) => {
    const data = itemMetricsRef.current[itemIndex]
    if (!data) return null

    const elapsed = Date.now() - data.startTime
    const readings = data.readings

    if (readings.length === 0) {
      return {
        itemIndex,
        avgEngagement: liveMetrics.engagement,
        avgFocus: liveMetrics.focus,
        timeSpentMs: elapsed,
      }
    }

    const avgEngagement = readings.reduce((s, r) => s + r.engagement, 0) / readings.length
    const avgFocus = readings.reduce((s, r) => s + r.focus, 0) / readings.length

    return {
      itemIndex,
      avgEngagement,
      avgFocus,
      timeSpentMs: elapsed,
    }
  }, [liveMetrics])

  const recordReading = useCallback((itemIndex) => {
    const data = itemMetricsRef.current[itemIndex]
    if (data) {
      data.readings.push({ ...liveMetrics })
    }
  }, [liveMetrics])

  useEffect(() => {
    return () => {
      stopSession()
      if (landmarkerRef.current) {
        landmarkerRef.current.close()
        landmarkerRef.current = null
      }
    }
  }, [stopSession])

  return {
    isReady,
    isActive,
    error,
    liveMetrics,
    startSession,
    stopSession,
    startTrackingItem,
    stopTrackingItem,
    recordReading,
    isDemo: !landmarkerRef.current,
  }
}