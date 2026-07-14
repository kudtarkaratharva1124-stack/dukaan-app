import { useCallback, useEffect, useState } from "react";
import { Store, UserCircle, KeyRound, Users, UserPlus, ShieldCheck } from "lucide-react";
import Header from "../components/layout/Header.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import Table from "../components/ui/Table.jsx";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Loader from "../components/ui/Loader.jsx";
import { notify } from "../components/ui/Toast.jsx";
import { settingsService } from "../services/settings.service.js";
import { useAuth } from "../hooks/useAuth.js";
import { formatDate } from "../utils/dates.js";
import "../styles/settings.css";

const TABS = [
  { key: "shop", label: "Shop Profile", icon: Store },
  { key: "profile", label: "My Profile", icon: UserCircle },
  { key: "password", label: "Password", icon: KeyRound },
  { key: "team", label: "Team", icon: Users, ownerOnly: true }
];

export default function Settings() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const visibleTabs = TABS.filter((t) => !t.ownerOnly || isOwner);
  const [activeTab, setActiveTab] = useState("shop");

  return (
    <>
      <Header title="Settings" subtitle="Manage your shop profile, account, and team access." />

      <div className="settings-tabs">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={"settings-tab" + (activeTab === key ? " active" : "")}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "shop" && <ShopProfileTab canEdit={isOwner || user?.role === "manager"} />}
      {activeTab === "profile" && <MyProfileTab />}
      {activeTab === "password" && <PasswordTab />}
      {activeTab === "team" && isOwner && <TeamTab />}
    </>
  );
}

// ---------------- Shop Profile ----------------

function ShopProfileTab({ canEdit }) {
  const [form, setForm] = useState({ name: "", ownerPhone: "", address: "", gstin: "" });
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService
      .getShop()
      .then((shop) => {
        setForm({
          name: shop.name || "",
          ownerPhone: shop.owner_phone || "",
          address: shop.address || "",
          gstin: shop.gstin || ""
        });
        setPlan(shop.plan || "free");
      })
      .catch((err) => notify.error(err.response?.data?.message || "Couldn't load shop profile"))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return notify.error("Shop name is required");
    setSaving(true);
    try {
      await settingsService.updateShop(form);
      notify.success("Shop profile updated");
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't update shop profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader fullscreen={false} label="Loading shop profile..." />;

  return (
    <Card
      title="Shop details"
      actions={<Badge tone="info">{plan.charAt(0).toUpperCase() + plan.slice(1)} plan</Badge>}
    >
      <form className="settings-form" onSubmit={submit}>
        <Input
          label="Shop name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          disabled={!canEdit}
          required
        />
        <Input
          label="Owner phone"
          value={form.ownerPhone}
          onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value }))}
          disabled={!canEdit}
        />
        <Input
          label="Address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          disabled={!canEdit}
        />
        <Input
          label="GSTIN"
          value={form.gstin}
          onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
          disabled={!canEdit}
          placeholder="Optional — shown on invoices"
        />
        {canEdit ? (
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        ) : (
          <p className="text-muted settings-hint">Only the shop owner or a manager can edit these details.</p>
        )}
      </form>
    </Card>
  );
}

// ---------------- My Profile ----------------

function MyProfileTab() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return notify.error("Name is required");
    setSaving(true);
    try {
      const updated = await settingsService.updateProfile(form);
      updateUser(updated);
      notify.success("Profile updated");
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Your account">
      <form className="settings-form" onSubmit={submit}>
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <Input label="Email" value={user?.email || ""} disabled />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <div className="settings-role-line">
          <ShieldCheck size={14} />
          Role: <Badge tone="info">{user?.role}</Badge>
        </div>
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

// ---------------- Password ----------------

function PasswordTab() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword) return notify.error("Enter your current password");
    if (form.newPassword.length < 6) return notify.error("New password must be at least 6 characters");
    if (form.newPassword !== form.confirmPassword) return notify.error("New passwords don't match");

    setSaving(true);
    try {
      const { message } = await settingsService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      notify.success(message || "Password updated");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Change password">
      <form className="settings-form" onSubmit={submit}>
        <Input
          label="Current password"
          type="password"
          value={form.currentPassword}
          onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
          required
        />
        <Input
          label="New password"
          type="password"
          value={form.newPassword}
          onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
          required
        />
        <p className="text-muted settings-hint">
          Changing your password signs you out on any other device you're logged in on.
        </p>
        <Button type="submit" loading={saving}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

// ---------------- Team ----------------

const INVITE_ROLES = [
  { value: "manager", label: "Manager — can manage inventory & shop settings" },
  { value: "cashier", label: "Cashier — can bill and view stock" },
  { value: "staff", label: "Staff — limited access" }
];

function TeamTab() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", phone: "", password: "", role: "cashier" });
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await settingsService.listTeam());
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitInvite = async (e) => {
    e.preventDefault();
    if (!invite.name.trim() || !invite.email.trim() || invite.password.length < 6) {
      return notify.error("Fill in name, email, and a password of at least 6 characters");
    }
    setSaving(true);
    try {
      await settingsService.inviteTeamMember(invite);
      notify.success("Team member added");
      setShowInvite(false);
      setInvite({ name: "", email: "", phone: "", password: "", role: "cashier" });
      load();
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't add team member");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member, role) => {
    setUpdatingId(member.id);
    try {
      const updated = await settingsService.updateTeamMember(member.id, { role });
      setTeam((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
      notify.success(`${member.name}'s role updated`);
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleActive = async (member) => {
    setUpdatingId(member.id);
    try {
      const updated = await settingsService.updateTeamMember(member.id, { isActive: !member.is_active });
      setTeam((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
      notify.success(updated.is_active ? `${member.name} reactivated` : `${member.name} deactivated`);
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't update team member");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card
      title="Team access"
      actions={
        <Button icon={UserPlus} variant="secondary" onClick={() => setShowInvite(true)}>
          Add team member
        </Button>
      }
    >
      <Table
        emptyText={loading ? "Loading..." : "No team members yet"}
        columns={[
          { key: "name", header: "Name" },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone", render: (r) => r.phone || "—" },
          {
            key: "role",
            header: "Role",
            render: (r) =>
              r.role === "owner" ? (
                <Badge tone="info">Owner</Badge>
              ) : (
                <select
                  className="settings-role-select"
                  value={r.role}
                  disabled={updatingId === r.id}
                  onChange={(e) => changeRole(r, e.target.value)}
                >
                  {INVITE_ROLES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              )
          },
          {
            key: "is_active",
            header: "Status",
            render: (r) => (r.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Deactivated</Badge>)
          },
          { key: "created_at", header: "Added", render: (r) => formatDate(r.created_at) },
          {
            key: "actions",
            header: "",
            render: (r) =>
              r.role === "owner" ? null : (
                <Button
                  size="sm"
                  variant={r.is_active ? "danger" : "secondary"}
                  loading={updatingId === r.id}
                  onClick={() => toggleActive(r)}
                >
                  {r.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              )
          }
        ]}
        data={team}
      />

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Add team member">
        <form className="settings-form" onSubmit={submitInvite}>
          <Input
            label="Name"
            value={invite.name}
            onChange={(e) => setInvite((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={invite.email}
            onChange={(e) => setInvite((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            label="Phone"
            value={invite.phone}
            onChange={(e) => setInvite((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Temporary password"
            type="password"
            value={invite.password}
            onChange={(e) => setInvite((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <div className="input-wrapper">
            <label className="input-label">Role</label>
            <select
              className="settings-role-select settings-role-select-full"
              value={invite.role}
              onChange={(e) => setInvite((f) => ({ ...f, role: e.target.value }))}
            >
              {INVITE_ROLES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={saving}>
            Add team member
          </Button>
        </form>
      </Modal>
    </Card>
  );
}
