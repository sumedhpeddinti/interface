import { useState } from 'react'
import { Check, KeyRound, Lock, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  IconButton,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui'
import { KPIGrid, PageHeader } from '../../components/store/PageParts'
import { NAV_GROUPS } from '../../components/store/StoreSidebar'
import { ROLE_ACCESS, ROLES } from '../../lib/orders'
import { dateLabel, initials, relativeDay } from '../../lib/format'
import { useNow } from '../../lib/ticker'

const AREAS = NAV_GROUPS.flatMap((group) => group.items).map((item) => ({
  area: item.area,
  label: item.label,
}))

/* A role holds every area, or it holds a slice of them. Manager is the only
   role that reaches reports and settings — everything else is limited. */
function fullAccess(role) {
  return (ROLE_ACCESS[role] || []).length === AREAS.length
}

export default function StaffPage() {
  const { state, actions } = useStore()
  const now = useNow()
  const [revealPins, setRevealPins] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', role: 'Cashier', pin: '', phone: '', title: '' })

  const staff = state.staff
  const current = staff.find((member) => member.id === state.session.staffId)

  const counts = {
    manager: staff.filter((member) => member.role === ROLES.MANAGER).length,
    cashier: staff.filter((member) => member.role === ROLES.CASHIER).length,
    kitchen: staff.filter((member) => member.role === ROLES.KITCHEN).length,
  }

  const pinTaken = staff.some((member) => member.pin === draft.pin)
  const validPin = /^\d{4}$/.test(draft.pin) && !pinTaken
  const valid = draft.name.trim() && validPin

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff & roles"
        description="Role-based access for the whole suite. A cashier can take payments but cannot open the financial reports without a manager PIN."
        badge={
          <Badge tone="indigo" size="md">
            Signed in as {current?.role || 'Manager'}
          </Badge>
        }
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setRevealPins((value) => !value)}>
              <KeyRound size={13} strokeWidth={1.9} />
              {revealPins ? 'Hide PINs' : 'Reveal PINs'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => actions.lockSession()}
            >
              <Lock size={13} strokeWidth={1.9} />
              Lock register
            </Button>
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
              <UserPlus size={13} strokeWidth={2} />
              Add staff
            </Button>
          </>
        }
      />

      <KPIGrid
        columns={4}
        items={[
          { label: 'Staff accounts', value: staff.length, hint: `${staff.filter((m) => m.active).length} active`, icon: ShieldCheck, tone: 'indigo' },
          { label: 'Managers', value: counts.manager, hint: 'full access', icon: ShieldCheck, tone: 'zinc' },
          { label: 'Cashiers', value: counts.cashier, hint: 'register & drawer', icon: ShieldCheck, tone: 'emerald' },
          { label: 'Kitchen', value: counts.kitchen, hint: 'KDS only', icon: ShieldCheck, tone: 'amber' },
        ]}
      />

      <Card>
        <CardHeader
          icon={ShieldCheck}
          title="User accounts"
          subtitle="Each account unlocks the suite with a 4-digit PIN at the lock screen."
        />
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Staff</TH>
                <TH>Role</TH>
                <TH>Title</TH>
                <TH>Phone</TH>
                <TH align="center">PIN</TH>
                <TH>Joined</TH>
                <TH>Status</TH>
                <TH align="right" />
              </TR>
            </THead>
            <TBody>
              {staff.map((member) => (
                <TR key={member.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
                        {initials(member.name)}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-zinc-900">{member.name}</p>
                        {member.id === state.session.staffId ? (
                          <p className="text-[10px] text-emerald-700">current session</p>
                        ) : (
                          <p className="tnum text-[10px] text-zinc-400">{member.id}</p>
                        )}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        tone={
                          member.role === ROLES.MANAGER
                            ? 'indigo'
                            : member.role === ROLES.CASHIER
                              ? 'emerald'
                              : 'amber'
                        }
                        size="sm"
                      >
                        {member.role}
                      </Badge>
                      <Badge tone={fullAccess(member.role) ? 'emerald' : 'zinc'} size="sm">
                        {fullAccess(member.role) ? 'Full access' : 'Limited'}
                      </Badge>
                    </div>
                  </TD>
                  <TD muted>{member.title}</TD>
                  <TD mono muted>
                    {member.phone}
                  </TD>
                  <TD align="center">
                    <span className="tnum inline-flex items-center gap-1.5 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-900">
                      {revealPins ? member.pin : '••••'}
                    </span>
                  </TD>
                  <TD>
                    <span className="block text-xs text-zinc-700">{dateLabel(member.joinedAt || now - member.joinedDaysAgo * 86400000)}</span>
                    <span className="block text-[10px] text-zinc-400">
                      {relativeDay(now - (member.joinedDaysAgo || 0) * 86400000, now)}
                    </span>
                  </TD>
                  <TD>
                    <Switch
                      checked={member.active !== false}
                      onChange={(value) =>
                        actions.updateStaff({
                          id: member.id,
                          patch: { active: value },
                          actor: current?.name,
                        })
                      }
                      label={`${member.name} active`}
                      className="items-center"
                    />
                  </TD>
                  <TD align="right">
                    <IconButton
                      icon={KeyRound}
                      label={`Use ${member.name}'s PIN`}
                      variant="secondary"
                      onClick={() => actions.setSession({ staffId: member.id })}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader
          icon={ShieldCheck}
          title="Role permissions"
          subtitle="Which areas each role can open. Manager is the only role that reaches reports and settings."
        />
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Area</TH>
                {Object.keys(ROLE_ACCESS).map((role) => (
                  <TH key={role} align="center">
                    {role}
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {AREAS.map((entry) => (
                <TR key={entry.area}>
                  <TD>{entry.label}</TD>
                  {Object.entries(ROLE_ACCESS).map(([role, areas]) => (
                    <TD key={role} align="center">
                      {areas.includes(entry.area) ? (
                        <span className="inline-flex justify-center text-emerald-600">
                          <Check size={14} strokeWidth={2.6} />
                        </span>
                      ) : (
                        <span className="inline-flex justify-center text-zinc-300">
                          <X size={14} strokeWidth={2.4} />
                        </span>
                      )}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader
          icon={Lock}
          title="Quick lock"
          subtitle="Hand the terminal over safely — the PIN pad takes over the whole view."
        />
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-xs leading-relaxed text-zinc-500">
            Locking hides every screen behind a 4-digit keypad. A cashier PIN gets back to the
            register; anything else needs the manager PIN (tips: the demo PINs are listed on the
            keypad itself).
          </p>
          <Button variant="primary" size="sm" onClick={() => actions.lockSession()}>
            <Lock size={13} strokeWidth={1.9} />
            Lock now
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a staff account"
        subtitle="New accounts get their own PIN and role permissions immediately."
        icon={UserPlus}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!valid}
              onClick={() => {
                actions.addStaff({ ...draft, actor: current?.name })
                setDraft({ name: '', role: 'Cashier', pin: '', phone: '', title: '' })
                setAddOpen(false)
              }}
            >
              Create account
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Full name" required>
            <Input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="e.g. Sunita More"
              autoFocus
            />
          </Field>
          <Field label="Role" hint="Determines which areas of the suite open up.">
            <Select
              value={draft.role}
              onChange={(event) => setDraft({ ...draft, role: event.target.value })}
            >
              {Object.values(ROLES).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Job title">
            <Input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="e.g. Cold Station Chef"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={draft.phone}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              placeholder="+91 …"
            />
          </Field>
          <Field
            label="4-digit PIN"
            required
            error={draft.pin && pinTaken ? 'That PIN is already in use' : ''}
            hint="Four digits, unique across the team."
          >
            <Input
              value={draft.pin}
              maxLength={4}
              inputMode="numeric"
              onChange={(event) =>
                setDraft({ ...draft, pin: event.target.value.replace(/\D/g, '').slice(0, 4) })
              }
              placeholder="0000"
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
