interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  label: string
  subtitle?: string
  showPercentage?: boolean
}

export default function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = '#fbbf24',
  label,
  subtitle,
  showPercentage = false
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = Math.min((value / max) * 100, 100)
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="circular-progress-svg">
        {/* Background circle */}
        <circle
          className="circular-progress-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          className="circular-progress-bar"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ stroke: color }}
        />
      </svg>
      
      <div className="circular-progress-content">
        {showPercentage ? (
          <div className="circular-progress-percentage">{Math.round(percentage)}%</div>
        ) : (
          <div className="circular-progress-value">{value}</div>
        )}
        <div className="circular-progress-label">{label}</div>
        {subtitle && <div className="circular-progress-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}
