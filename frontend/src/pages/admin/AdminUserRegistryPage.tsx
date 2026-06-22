import {useState} from 'react';
import {Users, Loader2, Search} from 'lucide-react';
import {PaginationControls} from '@/shared/ui/PaginationControls';

import {useTranslation} from '@/shared/lib/i18n/useTranslation';
import type {AdminUserFilters, AdminUserViewDto} from "@/features/auth/types";
import {
    useAdminBanUser,
    useAdminUnbanUser,
    useAdminUsers
} from "@/features/auth/sub-features/admin/hooks/useAdminUsers.ts";
import {AdminUserTable} from "@/features/auth/sub-features/admin/ui/AdminUserTable.tsx";
import {UserActionModal} from "@/features/auth/sub-features/admin/ui/UserActionModal.tsx";

export const AdminUserRegistryPage = () => {
    const {t} = useTranslation();
    const pageTxt = t.auth.admin.page;

    const [filters, setFilters] = useState<AdminUserFilters>({page: 0, size: 20, isBanned: null, q: ''});
    const [searchInput, setSearchInput] = useState('');

    const [selectedUser, setSelectedUser] = useState<AdminUserViewDto | null>(null);
    const [modalAction, setModalAction] = useState<'BAN' | 'UNBAN'>('BAN');

    const {data: pageData, isLoading, isFetching} = useAdminUsers(filters);
    const {mutate: banUser, isPending: isBanPending} = useAdminBanUser();
    const {mutate: unbanUser, isPending: isUnbanPending} = useAdminUnbanUser();

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters(prev => ({...prev, q: searchInput, page: 0}));
    };

    const openActionModal = (user: AdminUserViewDto) => {
        setSelectedUser(user);
        setModalAction(user.isBanned ? 'UNBAN' : 'BAN');
    };

    const handleConfirmAction = (reason: string) => {
        if (!selectedUser) return;

        const action = modalAction === 'BAN' ? banUser : unbanUser;
        action({userId: selectedUser.id, reason}, {
            onSuccess: () => setSelectedUser(null)
        });
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                        <Users size={24}/>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{pageTxt.title}</h1>
                </div>
                <p className="text-sm text-slate-400 ml-12">{pageTxt.subtitle}</p>
            </div>

            {/* Simple Inline Filter Bar */}
            <div
                className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={pageTxt.searchPlaceholder}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:border-violet-500 outline-none"
                    />
                </form>

                <select
                    value={filters.isBanned === null ? 'ALL' : String(filters.isBanned)}
                    onChange={(e) => setFilters(prev => ({
                        ...prev,
                        page: 0,
                        isBanned: e.target.value === 'ALL' ? null : e.target.value === 'true'
                    }))}
                    className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-sm text-slate-200 outline-none focus:border-violet-500"
                >
                    <option value="ALL">{pageTxt.filterAll}</option>
                    <option value="false">{pageTxt.filterActive}</option>
                    <option value="true">{pageTxt.filterBanned}</option>
                </select>
            </div>

            <div
                className="flex flex-col gap-0 rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-2xl">
                {isLoading && !pageData ? (
                    <div className="flex flex-col items-center justify-center py-32 text-violet-500">
                        <Loader2 size={40} className="animate-spin mb-4"/>
                    </div>
                ) : (
                    <>
                        <AdminUserTable
                            users={pageData?.content || []}
                            isLoading={isFetching}
                            onActionClick={openActionModal}
                        />
                        <PaginationControls
                            currentPage={filters.page}
                            totalPages={pageData?.totalPages || 0}
                            onPageChange={(newPage) => setFilters(prev => ({...prev, page: newPage}))}
                            isDisabled={isFetching}
                        />
                    </>
                )}
            </div>

            <UserActionModal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                onConfirm={handleConfirmAction}
                isLoading={isBanPending || isUnbanPending}
                actionType={modalAction}
                targetUsername={selectedUser?.username || ''}
            />
        </div>
    );
};