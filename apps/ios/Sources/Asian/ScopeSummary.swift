enum ScopeSummary {
    /// Placeholder pure-logic example — replace with real Track 9 domain code.
    /// Exists so `AsianTests` has something concrete to test against.
    static func label(forTaskCount count: Int) -> String {
        guard count > 0 else { return "no tasks scoped" }
        return count == 1 ? "1 task scoped" : "\(count) tasks scoped"
    }
}
