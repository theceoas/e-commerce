export default function AdminLoading() {
    return (
        <div className="flex items-center justify-center h-full min-h-[400px] w-full">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
                <p className="text-gray-500 animate-pulse">Loading...</p>
            </div>
        </div>
    )
}
