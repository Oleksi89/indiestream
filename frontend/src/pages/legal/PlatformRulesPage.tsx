export const PlatformRulesPage = () => {
    return (
        <div className="min-h-screen bg-slate-950 w-full py-12 px-4 sm:px-6 text-slate-200">
            <div
                className="max-w-4xl mx-auto bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 md:p-12 shadow-xl">
                <h1 className="text-2xl md:text-3xl font-bold mb-8 text-slate-100 pb-6 border-b border-slate-700/50">
                    Правила платформи та угода користувача
                </h1>

                <div className="space-y-6 text-slate-300 leading-relaxed">
                    <p className="text-violet-400 font-medium px-4 py-3 bg-violet-500/10 rounded-lg border border-violet-500/20">
                        Сторінка плейсхолдер для юридичного тексту правил платформи.
                    </p>

                    <p>
                        Завантажуючи будь-який контент на платформу, користувач підтверджує, що він є законним власником
                        авторських прав на цей матеріал або має всі необхідні ліцензії та дозволи від правовласників.
                    </p>

                    <p>
                        Користувач несе одноосібну відповідальність за будь-які претензії третіх осіб щодо порушення
                        інтелектуальної власності. Платформа залишає за собою право видаляти контент, який порушує ці
                        правила, без попереднього повідомлення.
                    </p>
                </div>
            </div>
        </div>
    );
};