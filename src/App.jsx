import { useRef, useState } from 'react'
import './App.css'

const ROOMMATES = ['Roommate A', 'Roommate B', 'Roommate C']

const initialItems = [
  {
    id: 'pizza-1',
    name: 'Pizza',
    totalPortions: 100,
    availablePortions: 25,
    unit: '%',
    spoiled: false,
  },
  {
    id: 'ketchup-1',
    name: 'Ketchup',
    totalPortions: 100,
    availablePortions: 100,
    unit: 'ml',
    spoiled: false,
  },
  {
    id: 'ketchup-2',
    name: 'Ketchup',
    totalPortions: 100,
    availablePortions: 100,
    unit: 'ml',
    spoiled: false,
  },
]

function App() {
  const nextApprovalId = useRef(1)
  const [items, setItems] = useState(initialItems)
  const [approvals, setApprovals] = useState([])
  const [clockTick, setClockTick] = useState(0)
  const [events, setEvents] = useState([
    'System ready. Pizza has exactly 25% remaining.',
  ])

  function pushEvent(message) {
    setEvents((prev) => [`T${clockTick}: ${message}`, ...prev].slice(0, 20))
  }

  function updateItem(itemId, updater) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? updater(item) : item)),
    )
  }

  function requestPortion({ itemId, roommate, amount, ttlTicks = 2 }) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item || item.spoiled) {
      pushEvent(`${roommate} request rejected: item unavailable.`)
      return false
    }
    if (item.availablePortions < amount) {
      pushEvent(
        `${roommate} request rejected: only ${item.availablePortions}${item.unit} left.`,
      )
      return false
    }

    updateItem(itemId, (current) => ({
      ...current,
      availablePortions: current.availablePortions - amount,
    }))

    const approvalId = `${itemId}-${roommate}-${nextApprovalId.current}`
    nextApprovalId.current += 1
    setApprovals((prev) => [
      ...prev,
      {
        id: approvalId,
        itemId,
        itemName: item.name,
        roommate,
        amount,
        status: 'approved',
        createdAt: clockTick,
        expiresAt: clockTick + ttlTicks,
      },
    ])
    pushEvent(`${roommate} approved for ${amount}${item.unit} of ${item.name}.`)
    return true
  }

  function consumeApproval(approvalId) {
    setApprovals((prev) =>
      prev.map((approval) =>
        approval.id === approvalId && approval.status === 'approved'
          ? { ...approval, status: 'consumed', consumedAt: clockTick }
          : approval,
      ),
    )
    pushEvent('Approved portion consumed.')
  }

  function runScenarioOneRace() {
    const pizzaId = 'pizza-1'
    const amount = 25

    setItems((prevItems) => {
      const nextItems = prevItems.map((item) => ({ ...item }))
      const pizza = nextItems.find((item) => item.id === pizzaId)
      if (!pizza || pizza.availablePortions < amount) {
        pushEvent('Scenario 1 blocked: pizza is not at 25%.')
        return prevItems
      }

      const roommates = ['Roommate B', 'Roommate C']
      const createdApprovals = []
      let remaining = pizza.availablePortions
      for (const roommate of roommates) {
        if (remaining >= amount) {
          remaining -= amount
          createdApprovals.push({
            id: `${pizzaId}-${roommate}-${nextApprovalId.current++}`,
            itemId: pizzaId,
            itemName: 'Pizza',
            roommate,
            amount,
            status: 'approved',
            createdAt: clockTick,
            expiresAt: clockTick + 2,
          })
        } else {
          pushEvent(
            `Scenario 1: ${roommate} denied because final 25% was already allocated.`,
          )
        }
      }

      pizza.availablePortions = remaining
      if (createdApprovals.length > 0) {
        setApprovals((prev) => [...prev, ...createdApprovals])
        pushEvent(
          `Scenario 1: ${createdApprovals[0].roommate} won final 25%; double allocation prevented.`,
        )
      }
      return nextItems
    })
  }

  function advanceTime() {
    const nextTick = clockTick + 1
    setClockTick(nextTick)

    const expired = approvals.filter(
      (approval) => approval.status === 'approved' && approval.expiresAt <= nextTick,
    )

    if (expired.length > 0) {
      for (const approval of expired) {
        updateItem(approval.itemId, (item) => {
          if (item.spoiled) {
            return item
          }
          return {
            ...item,
            availablePortions: item.availablePortions + approval.amount,
          }
        })
      }
      setApprovals((prev) =>
        prev.map((approval) =>
          approval.status === 'approved' && approval.expiresAt <= nextTick
            ? { ...approval, status: 'expired' }
            : approval,
        ),
      )
      pushEvent(
        `Scenario 2: ${expired.length} stale approvals expired and were released.`,
      )
    } else {
      pushEvent('Clock advanced with no expiring approvals.')
    }
  }

  function spoilItem(itemId) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return

    updateItem(itemId, (current) => ({
      ...current,
      spoiled: true,
      availablePortions: 0,
    }))
    setApprovals((prev) =>
      prev.map((approval) =>
        approval.itemId === itemId && approval.status === 'approved'
          ? { ...approval, status: 'void_spoiled' }
          : approval,
      ),
    )
    pushEvent(`Scenario 2: ${item.name} spoiled, active approvals voided fairly.`)
  }

  function correctInventory(itemId, amount) {
    updateItem(itemId, (item) => ({
      ...item,
      availablePortions: Math.max(0, item.availablePortions - amount),
    }))
    pushEvent(`Scenario 4: inventory corrected by -${amount}.`)
  }

  return (
    <main className="app">
      <h1>FridgePolice Prototype</h1>
      <p className="subtitle">
        Handles race conflicts, stale approvals, duplicate item names, and
        real-world inventory corrections.
      </p>

      <section className="panel">
        <h2>Controls</h2>
        <div className="row">
          <button onClick={runScenarioOneRace}>
            Run Scenario 1: B + C race for final 25%
          </button>
          <button onClick={advanceTime}>Advance clock (T+1)</button>
        </div>
      </section>

      <section className="panel">
        <h2>Food Inventory</h2>
        <div className="grid">
          {items.map((item) => (
            <article className="card" key={item.id}>
              <h3>
                {item.name} <span className="item-id">({item.id})</span>
              </h3>
              <p>
                Available: <strong>{item.availablePortions}</strong>
                {item.unit} / {item.totalPortions}
                {item.unit}
              </p>
              <p>Status: {item.spoiled ? 'Spoiled' : 'Fresh'}</p>

              <div className="row">
                {ROOMMATES.map((roommate) => (
                  <button
                    key={`${item.id}-${roommate}`}
                    onClick={() => requestPortion({ itemId: item.id, roommate, amount: 25 })}
                  >
                    Approve 25 for {roommate.slice(-1)}
                  </button>
                ))}
              </div>
              <div className="row">
                <button onClick={() => spoilItem(item.id)}>Mark spoiled / thrown</button>
                <button onClick={() => correctInventory(item.id, 25)}>
                  Correct missing -25
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Approvals</h2>
        <p>Current clock: T{clockTick}</p>
        {approvals.length === 0 ? (
          <p>No approvals yet.</p>
        ) : (
          <ul>
            {approvals.map((approval) => (
              <li key={approval.id}>
                {approval.roommate} - {approval.itemName} ({approval.itemId}) -{' '}
                {approval.amount} - <strong>{approval.status}</strong> (expires
                at T{approval.expiresAt})
                {approval.status === 'approved' && (
                  <button
                    className="inline-button"
                    onClick={() => consumeApproval(approval.id)}
                  >
                    Consume now
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Event Log</h2>
        <ul>
          {events.map((event, index) => (
            <li key={`${event}-${index}`}>{event}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
