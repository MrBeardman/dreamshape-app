import { useState, useEffect } from 'react'

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  label: string
  subtitle?: string
  displayMode?: 'percentage' | 'value' | 'fraction' // New prop
}

export default function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = '#fbbf24',
  label,
  subtitle,
  displayMode = 'percentage' // Default to percentage for backward compatibility
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const animatedPercentage = Math.min((animatedValue / max) * 100, 100)
  const offset = circumference - (animatedPercentage / 100) * circumference

  useEffect(() => {
    if (hasAnimated) return

    // Delay start slightly for staggered effect
    const startDelay = setTimeout(() => {
      const duration = 1500 // 1.5 seconds
      const steps = 60
      const increment = value / steps
      const stepDuration = duration / steps
      let currentStep = 0

      const timer = setInterval(() => {
        currentStep++
        const newValue = Math.min(increment * currentStep, value)
        setAnimatedValue(newValue)

        if (currentStep >= steps) {
          clearInterval(timer)
          setAnimatedValue(value)
          setHasAnimated(true)
        }
      }, stepDuration)

      return () => clearInterval(timer)
    }, 200)

    return () => clearTimeout(startDelay)
  }, [value, hasAnimated])

  // Determine what to display inside the circle
  const getDisplayText = () => {
    if (displayMode === 'percentage') {
      return `${Math.round(animatedPercentage)}%`
    } else if (displayMode === 'value') {
      return Math.round(animatedValue).toString()
    } else if (displayMode === 'fraction') {
      return `${Math.round(animatedValue)}/${max}`
    }
    return `${Math.round(animatedPercentage)}%`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ 
            transition: 'stroke-dashoffset 0.1s ease-out'
          }}
        />
        
        {/* Percentage text inside circle */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.35em"
          fontSize="16"
          fontWeight="bold"
          fill="white"
          style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          {getDisplayText()}
        </text>
      </svg>
      
      {/* Labels below circle */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
