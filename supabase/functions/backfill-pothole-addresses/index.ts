import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PotholeRow = {
  id: string
  lat: number
  lng: number
  address: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const batchSize = Number(new URL(req.url).searchParams.get('limit') ?? 100)

    const { data: rows, error: fetchError } = await supabase
      .from('potholes')
      .select('id, lat, lng, address')
      .or('geocode_status.eq.pending,geocode_status.eq.failed')
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (fetchError) throw fetchError

    const potholes = (rows ?? []) as PotholeRow[]
    let updated = 0
    let failed = 0

    for (const pothole of potholes) {
      try {
        const geocoded = await reverseGeocodeNominatim(pothole.lat, pothole.lng)

        if (!geocoded) {
          await supabase
            .from('potholes')
            .update({ geocode_status: 'failed' })
            .eq('id', pothole.id)
          failed += 1
          await sleep(250)
          continue
        }

        const { error: updateError } = await supabase
          .from('potholes')
          .update({
            address: geocoded.address,
            normalized_address: geocoded.normalized_address,
            parish: geocoded.parish,
            municipality: geocoded.municipality,
            district: geocoded.district,
            postal_code: geocoded.postal_code,
            geocode_status: 'resolved',
            geocoded_at: new Date().toISOString(),
          })
          .eq('id', pothole.id)

        if (updateError) throw updateError

        updated += 1
      } catch {
        await supabase
          .from('potholes')
          .update({ geocode_status: 'failed' })
          .eq('id', pothole.id)
        failed += 1
      }

      await sleep(250)
    }

    return new Response(
      JSON.stringify({ processed: potholes.length, updated, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function reverseGeocodeNominatim(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'pt' },
  })

  if (!response.ok) return null
  const data = await response.json()
  if (!data?.display_name) return null

  const address = data.address || {}
  const road = pickFirst(address.road, address.pedestrian, address.footway, address.path, address.cycleway)
  const houseNumber = pickFirst(address.house_number)
  const parish = pickFirst(address.suburb, address.city_district, address.neighbourhood, address.quarter, address.hamlet)
  const municipality = pickFirst(address.city, address.town, address.village, address.municipality, address.county)
  const district = pickFirst(address.state_district, address.state, address.county)
  const postalCode = pickFirst(address.postcode)

  const line1 = [road, houseNumber].filter(Boolean).join(', ')
  const line2 = [postalCode, municipality].filter(Boolean).join(' ')
  const normalizedAddress = [line1, parish, line2, district].filter(Boolean).join(', ')

  return {
    address: data.display_name,
    normalized_address: normalizedAddress || data.display_name,
    parish: parish || null,
    municipality: municipality || null,
    district: district || null,
    postal_code: postalCode || null,
  }
}

function pickFirst(...values: Array<string | undefined>) {
  for (const value of values) {
    if (value && value.trim()) return value.trim()
  }
  return null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
