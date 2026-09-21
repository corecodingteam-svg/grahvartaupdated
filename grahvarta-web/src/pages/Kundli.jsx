import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import toast from 'react-hot-toast'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { setPageMeta } from '../lib/demo'

export default function Kundli() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', dob: '', tob: '', place: '' })

  useEffect(() => {
    setPageMeta(
      'Free Kundli — Generate Your Birth Chart | GrahVarta',
      'Generate your free Kundli online with planet positions, Rashi, Nakshatra, Dasha and Dosha details.'
    )
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.dob || !form.tob || !form.place.trim()) {
      toast.error('Please fill in all fields to generate your Kundli.')
      return
    }
    navigate('/kundli/result', { state: form })
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Free Tool"
        title="Generate Your Free Kundli"
        subtitle="Enter your birth details to get your personalised demo birth chart, planet positions and more."
      />

      <Card className="max-w-xl">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
            <ScrollText size={20} />
          </span>
          <p className="text-sm text-text-secondary">
            All fields are required. This is a demo tool — results are for illustration only.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="kundli-name" className="block text-sm font-medium mb-1.5">Full Name</label>
            <input
              id="kundli-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="kundli-dob" className="block text-sm font-medium mb-1.5">Date of Birth</label>
            <input
              id="kundli-dob"
              name="dob"
              type="date"
              value={form.dob}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="kundli-tob" className="block text-sm font-medium mb-1.5">Time of Birth</label>
            <input
              id="kundli-tob"
              name="tob"
              type="time"
              value={form.tob}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="kundli-place" className="block text-sm font-medium mb-1.5">Birth Place</label>
            <input
              id="kundli-place"
              name="place"
              type="text"
              value={form.place}
              onChange={handleChange}
              placeholder="City, State"
              className="input-field"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">
            Generate Kundli
          </button>
        </form>
      </Card>
    </div>
  )
}
