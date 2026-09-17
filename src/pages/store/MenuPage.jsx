import { useMemo, useState } from 'react'
import {
  BookOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  DishThumb,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  SearchInput,
  Select,
  Switch,
  Table,
  TableWrap,
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
  VegMark,
} from '../../components/ui'
import { KPIGrid, PageHeader } from '../../components/store/PageParts'
import { CATEGORIES, STATIONS } from '../../lib/orders'
import { classNames, money } from '../../lib/format'

const BLANK = {
  name: '',
  description: '',
  price: '',
  category: 'Main Course',
  station: 'Hot Kitchen',
  isVeg: true,
  isBestseller: false,
  rating: 4.5,
  image: '',
  available: true,
}

export default function MenuPage() {
  const { state, actions } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const staff = (state.staff || []).find((member) => member.id === state.session.staffId)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.menu
      .filter((item) => (category === 'All' ? true : item.category === category))
      .filter((item) =>
        q
          ? item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
          : true,
      )
  }, [state.menu, category, query])

  const stats = {
    total: state.menu.length,
    veg: state.menu.filter((item) => item.isVeg).length,
    bestsellers: state.menu.filter((item) => item.isBestseller).length,
    avgPrice: state.menu.length
      ? state.menu.reduce((sum, item) => sum + item.price, 0) / state.menu.length
      : 0,
  }

  function startCreate() {
    setForm(BLANK)
    setEditing('new')
  }

  function startEdit(item) {
    setForm({ ...item, price: String(item.price), rating: String(item.rating) })
    setEditing(item.id)
  }

  function save() {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price) || 0,
      category: form.category,
      station: form.station,
      isVeg: form.isVeg,
      isBestseller: form.isBestseller,
      rating: Number(form.rating) || 4.5,
      image: form.image.trim(),
      available: form.available,
    }
    if (!payload.name || !payload.price) return
    if (editing === 'new') {
      actions.addMenuItems({ item: payload, actor: staff?.name })
    } else {
      actions.updateMenuItem({ id: editing, patch: payload, actor: staff?.name })
    }
    setEditing(null)
  }

  const valid = form.name.trim() && Number(form.price) > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Menu manager"
        description="The catalogue the guest QR menu and the counter both read from. Prices exclude GST; stations route tickets to the right prep line."
        actions={
          <Button variant="primary" size="sm" onClick={startCreate}>
            <Plus size={13} strokeWidth={2.4} />
            New dish
          </Button>
        }
      />

      <KPIGrid
        columns={4}
        items={[
          { label: 'Dishes on the menu', value: stats.total, hint: 'live in the catalogue', icon: BookOpen, tone: 'zinc' },
          { label: 'Vegetarian', value: stats.veg, hint: `${stats.total - stats.veg} non-veg`, icon: UtensilsCrossed, tone: 'emerald' },
          { label: 'Bestsellers', value: stats.bestsellers, hint: 'badged on the guest menu', icon: Sparkles, tone: 'amber' },
          { label: 'Average price', value: money(stats.avgPrice), hint: 'excluding 5% GST', icon: BookOpen, tone: 'indigo' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={category}
          onChange={setCategory}
          tabs={[
            { id: 'All', label: 'All', count: state.menu.length },
            ...CATEGORIES.map((name) => ({
              id: name,
              label: name,
              count: state.menu.filter((item) => item.category === name).length,
            })),
          ]}
        />
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search dishes"
          className="w-full sm:w-72"
        />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No dishes matched"
            description="Adjust the filter or create a new dish for this category."
            action={
              <Button size="sm" variant="primary" onClick={startCreate}>
                New dish
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Dish</TH>
                  <TH>Category</TH>
                  <TH>Station</TH>
                  <TH align="center">Type</TH>
                  <TH align="right">Price</TH>
                  <TH align="right">Rating</TH>
                  <TH>Availability</TH>
                  <TH align="right" />
                </TR>
              </THead>
              <TBody>
                {filtered.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <DishThumb item={item} size={36} rounded="rounded" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-900">
                            {item.name}
                            {item.isBestseller ? (
                              <Badge tone="amber" size="sm">
                                Top
                              </Badge>
                            ) : null}
                          </p>
                          <p className="max-w-md truncate text-[11px] text-zinc-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD muted>{item.category}</TD>
                    <TD>
                      <Badge tone="zinc" size="sm">
                        {item.station}
                      </Badge>
                    </TD>
                    <TD align="center">
                      <span className="inline-flex justify-center">
                        <VegMark isVeg={item.isVeg} />
                      </span>
                    </TD>
                    <TD align="right" mono className="font-semibold">
                      {money(item.price)}
                    </TD>
                    <TD align="right" mono muted>
                      {item.rating?.toFixed?.(1)}
                    </TD>
                    <TD>
                      <button
                        type="button"
                        onClick={() =>
                          actions.updateMenuItem({
                            id: item.id,
                            patch: { available: item.available === false },
                            actor: staff?.name,
                          })
                        }
                        className="inline-flex"
                        aria-label={`Toggle availability for ${item.name}`}
                      >
                        <Badge
                          tone={item.available === false ? 'rose' : 'emerald'}
                          size="sm"
                          dot
                        >
                          {item.available === false ? 'Off menu' : 'Available'}
                        </Badge>
                      </button>
                    </TD>
                    <TD align="right">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          icon={Pencil}
                          label={`Edit ${item.name}`}
                          variant="secondary"
                          onClick={() => startEdit(item)}
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Delete ${item.name}`}
                          variant="secondary"
                          onClick={() => setDeleteTarget(item)}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New dish' : 'Edit dish'}
        subtitle="Appears on the guest QR menu the moment you save."
        icon={UtensilsCrossed}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!valid} onClick={save}>
              {editing === 'new' ? 'Create dish' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Dish name" required className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Paneer Butter Masala"
              autoFocus
            />
          </Field>

          <Field label="Description" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="How it is cooked, what it comes with"
            />
          </Field>

          <Field label="Price (₹)" hint="Tax-exclusive" required>
            <Input
              type="number"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              placeholder="230"
            />
          </Field>

          <Field label="Rating" hint="Shown on the guest menu card">
            <Input
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={form.rating}
              onChange={(event) => setForm({ ...form, rating: event.target.value })}
            />
          </Field>

          <Field label="Category">
            <Select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {CATEGORIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kitchen station" hint="Routes the ticket on the KDS">
            <Select
              value={form.station}
              onChange={(event) => setForm({ ...form, station: event.target.value })}
            >
              {STATIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Photo URL"
            className="sm:col-span-2"
            hint="Optional. Without a photo the menu shows a monochrome category tile."
          >
            <Input
              value={form.image}
              onChange={(event) => setForm({ ...form, image: event.target.value })}
              placeholder="https://…"
            />
          </Field>

          <div className="flex flex-col gap-3 sm:col-span-2">
            <Switch
              checked={form.isVeg}
              onChange={(value) => setForm({ ...form, isVeg: value })}
              label="Vegetarian"
              hint="Toggles the green or red veg mark on the guest menu."
            />
            <Switch
              checked={form.isBestseller}
              onChange={(value) => setForm({ ...form, isBestseller: value })}
              label="Bestseller"
              hint="Badges the dish and includes it in Top Picks."
            />
            <Switch
              checked={form.available}
              onChange={(value) => setForm({ ...form, available: value })}
              label="Available to order"
              hint="Turn off to hide from guests without deleting the dish."
            />
          </div>

          <div className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 sm:col-span-2">
            <DishThumb
              item={{ ...form, price: Number(form.price) || 0 }}
              size={56}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900">
                {form.name || 'Dish preview'}
              </p>
              <p className="tnum text-[11px] text-zinc-500">
                {money(Number(form.price) || 0)} · {form.category} · {form.station}
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          actions.deleteMenuItem({ id: deleteTarget.id, actor: staff?.name })
        }
        title={`Delete ${deleteTarget?.name || 'dish'}?`}
        description="It is removed from the catalogue immediately. Past invoices keep their own copy of the price, so historic records stay intact."
        confirmLabel="Delete dish"
        tone="danger"
      />

      <p className={classNames('pb-2 text-[11px] text-zinc-400')}>
        {stats.total} dishes · {CATEGORIES.length} categories · {STATIONS.length} prep stations
      </p>
    </div>
  )
}
