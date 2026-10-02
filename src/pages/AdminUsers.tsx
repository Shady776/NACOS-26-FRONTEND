import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, MoreVertical, Edit, Trash2, Search,
  Loader2, AlertCircle, X, Save, KeyRound, RefreshCw, UserPlus, Shield,
  Eye, EyeOff,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BASE_URL } from "@/components/api/api";

const DEPARTMENTS = [
  { value: 'CSC', label: 'Computer Science (CSC)' },
  { value: 'SEN', label: 'Software Engineering (SEN)' },
  { value: 'IFT', label: 'Information Technology (IFT)' },
  { value: 'CYB', label: 'Cybersecurity (CYB)' }
];

const ROLE_OPTIONS = [
  { value: 'teacher', label: 'Teacher', icon: '🎓' },
  { value: 'admin', label: 'Admin', icon: '🛡️' },
];

/* ── Reusable password input ──────────────────────────────────────────────── */
const PasswordInput = ({ value, onChange, placeholder = "Min. 6 characters" }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminName, setAdminName] = useState('');

  const [modalType, setModalType] = useState(null); // 'edit' | 'password' | 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    username: '',
    department: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    confirm_password: ''
  });

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    department: '',
    role: 'teacher',
  });
  const [addUserSubmitting, setAddUserSubmitting] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  const fetchAdminProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminName(data.full_name || data.username);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminProfile();
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(user =>
    (user.full_name || user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Add User ──────────────────────────────────────────────────────────────

  const openAddUserModal = () => {
    setNewUserForm({ username: '', email: '', full_name: '', password: '', department: '', role: 'teacher' });
    setAddUserError('');
    setShowAddUser(true);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.email || !newUserForm.password) {
      setAddUserError('Username, email, and password are required');
      return;
    }
    if (newUserForm.password.length < 6) {
      setAddUserError('Password must be at least 6 characters');
      return;
    }

    setAddUserSubmitting(true);
    setAddUserError('');

    const endpoint = newUserForm.role === 'admin'
      ? `${BASE_URL}/admin/users/admin`
      : `${BASE_URL}/admin/users/teacher`;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUserForm)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create user');
      }

      await fetchUsers();
      setShowAddUser(false);
    } catch (err) {
      setAddUserError(err.message);
    } finally {
      setAddUserSubmitting(false);
    }
  };

  // ── Edit / Password / Delete handlers ────────────────────────────────────

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      department: user.department || ''
    });
    setError('');
    setSuccessMsg('');
    setModalType('edit');
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordForm({ new_password: '', confirm_password: '' });
    setError('');
    setSuccessMsg('');
    setModalType('password');
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setError('');
    setModalType('delete');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setError('');
    setSuccessMsg('');
  };

  const handleEditUser = async () => {
    if (!editForm.full_name && !editForm.email && !editForm.username) {
      setError('Please fill in at least one field');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = selectedUser.role === 'teacher'
        ? `${BASE_URL}/users/teacher/${selectedUser.id}`
        : `${BASE_URL}/users/student/${selectedUser.id}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update user');
      }

      await fetchUsers();
      setSuccessMsg('User updated successfully!');
      setTimeout(closeModal, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordForm.new_password || !passwordForm.confirm_password) {
      setError('Please fill in both fields');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BASE_URL}/admin/users/${selectedUser.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: passwordForm.new_password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to reset password');
      }

      setSuccessMsg('Password reset successfully!');
      setTimeout(closeModal, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BASE_URL}/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to delete user');
      }

      await fetchUsers();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getRoleBadgeStyle = (role) => {
    if (role === 'teacher') return 'bg-primary/10 text-primary border-primary/20';
    if (role === 'admin') return 'bg-purple-500/10 text-purple-600 border-purple-200';
    return 'bg-secondary text-muted-foreground border-border';
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="admin" userName={adminName}>
      <div className="space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage student, teacher, and admin accounts</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={openAddUserModal}>
              <UserPlus className="w-4 h-4 mr-2" /> Add User
            </Button>
            <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              All Users
              {!loading && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({filteredUsers.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-primary" size={40} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users size={48} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">{searchTerm ? 'No users match your search' : 'No users found'}</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b bg-secondary/10 text-sm min-w-[600px]">
                  <div className="col-span-2">Name & Email</div>
                  <div>Role</div>
                  <div>Department</div>
                  <div className="text-right">Actions</div>
                </div>
                <div className="divide-y min-w-[600px]">
                  {filteredUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="grid grid-cols-5 gap-4 p-4 items-center text-sm hover:bg-muted/30 transition-colors"
                    >
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                          {(user.full_name || user.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name || user.username}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs font-medium px-2 py-1 rounded border ${getRoleBadgeStyle(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {user.department || <span className="italic opacity-50">—</span>}
                      </div>
                      <div className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => openEditModal(user)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit Details
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openPasswordModal(user)}>
                              <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openDeleteModal(user)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Add User Modal ────────────────────────────────────────────────── */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-border max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-card p-6 border-b border-border flex justify-between items-center rounded-t-3xl z-10">
              <div>
                <h3 className="text-xl font-bold text-foreground">Create New User</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Add a teacher or admin to the platform</p>
              </div>
              <button
                onClick={() => setShowAddUser(false)}
                className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {addUserError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="text-destructive flex-shrink-0" size={18} />
                  <p className="text-sm text-destructive font-medium">{addUserError}</p>
                </div>
              )}

              {/* Role selector */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Role <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewUserForm({ ...newUserForm, role: opt.value })}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        newUserForm.role === opt.value
                          ? opt.value === 'admin'
                            ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                            : 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
                      }`}
                    >
                      <span className="text-base">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {newUserForm.role === 'admin' && (
                  <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                    <Shield size={12} /> This user will have full admin privileges.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">
                    Username <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="e.g. dr_johnson"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="e.g. Dr. Johnson"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. johnson@university.edu"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">
                  Password <span className="text-destructive">*</span>
                </label>
                <PasswordInput
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Department</label>
                <Select
                  value={newUserForm.department}
                  onValueChange={(v) => setNewUserForm({ ...newUserForm, department: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddUser(false)} disabled={addUserSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={addUserSubmitting}
                  className={`flex items-center gap-2 ${
                    newUserForm.role === 'admin' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''
                  }`}
                >
                  {addUserSubmitting
                    ? <><Loader2 className="animate-spin" size={16} /> Creating...</>
                    : <><Save size={16} /> Create {newUserForm.role === 'admin' ? 'Admin' : 'Teacher'}</>
                  }
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Edit User Modal ───────────────────────────────────────────────── */}
      {modalType === 'edit' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-border"
          >
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-foreground">Edit User Details</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Editing: <span className="font-medium text-foreground">{selectedUser.full_name || selectedUser.username}</span>
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="text-destructive flex-shrink-0" size={18} />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}
              {successMsg && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
                  <p className="text-sm text-primary font-medium">{successMsg}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Username</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Department</label>
                <Select
                  value={editForm.department}
                  onValueChange={(value) => setEditForm({ ...editForm, department: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal} disabled={submitting}>Cancel</Button>
                <Button onClick={handleEditUser} disabled={submitting} className="flex items-center gap-2">
                  {submitting
                    ? <><Loader2 className="animate-spin" size={16} /> Saving...</>
                    : <><Save size={16} /> Save Changes</>
                  }
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Reset Password Modal ──────────────────────────────────────────── */}
      {modalType === 'password' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-md shadow-2xl border border-border"
          >
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-foreground">Reset Password</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  For: <span className="font-medium text-foreground">{selectedUser.full_name || selectedUser.username}</span>
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="text-destructive flex-shrink-0" size={18} />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}
              {successMsg && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
                  <p className="text-sm text-primary font-medium">{successMsg}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">New Password</label>
                <PasswordInput
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Confirm Password</label>
                <PasswordInput
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters. The user will need to use this new password to log in.
              </p>

              <div className="pt-2 flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal} disabled={submitting}>Cancel</Button>
                <Button onClick={handleResetPassword} disabled={submitting} className="flex items-center gap-2">
                  {submitting
                    ? <><Loader2 className="animate-spin" size={16} /> Resetting...</>
                    : <><KeyRound size={16} /> Reset Password</>
                  }
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {modalType === 'delete' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl w-full max-w-md shadow-2xl border border-border"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="text-destructive" size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-foreground mb-2">
                Are you sure you want to delete the account for:
              </p>
              <div className="bg-secondary/50 rounded-xl p-3 mb-4">
                <p className="font-semibold text-foreground">{selectedUser.full_name || selectedUser.username}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2 mb-4">
                  <AlertCircle className="text-destructive flex-shrink-0" size={18} />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeModal} disabled={submitting}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={submitting}
                  className="flex items-center gap-2"
                >
                  {submitting
                    ? <><Loader2 className="animate-spin" size={16} /> Deleting...</>
                    : <><Trash2 size={16} /> Delete Account</>
                  }
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminUsers;