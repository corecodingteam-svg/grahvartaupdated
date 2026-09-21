const toneClasses = {
  orange: 'badge-orange',
  gold: 'badge-gold',
  online: 'badge-online',
  offline: 'badge-offline',
}

export default function Badge({ children, tone = 'orange', className = '', ...props }) {
  return (
    <span className={`${toneClasses[tone] || toneClasses.orange} ${className}`} {...props}>
      {children}
    </span>
  )
}
