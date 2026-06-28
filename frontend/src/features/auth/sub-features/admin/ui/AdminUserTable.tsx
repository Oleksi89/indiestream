import {ShieldAlert, ShieldCheck, Clock, UserX, UserCheck} from 'lucide-react';
import type {AdminUserViewDto} from '../../../types';
import {useTranslation} from '@/shared/lib/i18n/useTranslation';

interface AdminUserTableProps {
    users: AdminUserViewDto[];
    isLoading: boolean;
    onActionClick: (user: AdminUserViewDto) => void;
}

export const AdminUserTable = ({users, isLoading, onActionClick}: AdminUserTableProps) => {
    const {t} = useTranslation();
    const tbl = t.auth.admin.table;

    if (!users.length && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <ShieldAlert size={48} className="mb-4 text-slate-600 opacity-50"/>
                <p className="text-lg font-medium text-slate-300">{tbl.noUsers}</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto">
            <table
                className={`w-full text-left text-sm text-slate-300 transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <thead className="bg-slate-950/80 text-xs uppercase text-slate-500 border-b border-slate-800">
                <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">{tbl.colUser}</th>
                    <th className="px-6 py-4 font-medium">{tbl.colRole}</th>
                    <th className="px-6 py-4 font-medium">{tbl.colStatus}</th>
                    <th className="px-6 py-4 font-medium hidden md:table-cell">{tbl.colDate}</th>
                    <th className="px-6 py-4 font-medium text-right">{tbl.colAction}</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                {users.map((user) => (
                    <tr key={user.id} className="group hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            {user.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-200">{user.alias || user.username}</span>
                                    <span className="text-xs text-slate-500">{user.email}</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-400">{user.role}</td>
                        <td className="px-6 py-4">
                            {user.isBanned ? (
                                <span
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                        <UserX size={12}/> BANNED
                                    </span>
                            ) : (
                                <span
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <ShieldCheck size={12}/> ACTIVE
                                    </span>
                            )}
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell text-slate-400">
                            <div className="flex items-center gap-1.5 text-xs">
                                <Clock size={12} className="text-slate-500"/>
                                {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            {user.role !== 'ADMIN' && (
                                <button
                                    onClick={() => onActionClick(user)}
                                    className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors ${
                                        user.isBanned
                                            ? 'text-emerald-500 hover:bg-emerald-500/10'
                                            : 'text-red-500 hover:bg-red-500/10'
                                    }`}
                                    title={user.isBanned ? tbl.actionUnban : tbl.actionBan}
                                >
                                    {user.isBanned ? <UserCheck size={18}/> : <UserX size={18}/>}
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};