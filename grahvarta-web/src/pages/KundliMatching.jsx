import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartHandshake } from 'lucide-react'
import toast from 'react-hot-toast'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { setPageMeta } from '../lib/demo'

const emptyPerson = { name: '', dob: '', tob: '', place: '' }

function PersonFields({ label, value, onChange, prefix }) {
  return (
    <Card className="flex-1">
      <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">{label}</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor={`${prefix}-name`} className="block text-sm font-medium mb-1.5">Full Name</label>
          <input
            id={`${prefix}-name`}
            type="text"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Enter full name"
            className="input-field"
            required
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-dob`} className="block text-sm font-medium mb-1.5">Date of Birth</label>
          <input
            id={`${prefix}-dob`}
            type="date"
            value={value.dob}
            onChange={(e) => onChange({ ...value, dob: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-tob`} className="block text-sm font-medium mb-1.5">Time of Birth</label>
          <input
            id={`${prefix}-tob`}
            type="time"
            value={value.tob}
            onChange={(e) => onChange({ ...value, tob: e.target.value })}
            className="input-field"
            required
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-place`} className="block text-sm font-medium mb-1.5">Birth Place</label>
          <input
            id={`${prefix}-place`}
            type="text"
            value={value.place}
            onChange={(e) => onChange({ ...value, place: e.target.value })}
            placeholder="City, State"
            className="input-field"
            required
          />
        </div>
      </div>
    </Card>
  )
}

export default function KundliMatching() {
  const navigate = useNavigate()
  const [person1, setPerson1] = useState(emptyPerson)
  const [person2, setPerson2] = useState(emptyPerson)

  useEffect(() => {
    setPageMeta(
      'Kundli Matching — Guna Milan Compatibility | GrahVarta',
      'Match kundlis for marriage compatibility with a free demo Guna Milan score out of 36 and detailed Koota breakdown.'
    )
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const filled = [person1, person2].every((p) => p.name.trim() && p.dob && p.tob && p.place.trim())
    if (!filled) {
      toast.error('Please fill in both partners’ details.')
      return
    }
    navigate('/kundli-matching/result', { state: { person1, person2 } })
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Free Tool"
        title="Kundli Matching"
        subtitle="Enter both partners' birth details to see a demo Guna Milan compatibility score."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
            <HeartHandshake size={20} />
          </span>
          <p className="text-sm text-text-secondary">
            This is a demo tool — results are for illustration only.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <PersonFields label="Person 1" value={person1} onChange={setPerson1} prefix="p1" />
          <PersonFields label="Person 2" value={person2} onChange={setPerson2} prefix="p2" />
        </div>
        <button type="submit" className="btn-primary w-full sm:w-auto sm:self-center sm:px-16">
          Check Compatibility
        </button>
      </form>
    </div>
  )
}
