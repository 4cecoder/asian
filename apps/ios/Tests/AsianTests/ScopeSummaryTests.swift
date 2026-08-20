import Testing

@testable import Asian

struct ScopeSummaryTests {
    @Test func zeroTasks() {
        #expect(ScopeSummary.label(forTaskCount: 0) == "no tasks scoped")
    }

    @Test func singularTask() {
        #expect(ScopeSummary.label(forTaskCount: 1) == "1 task scoped")
    }

    @Test func pluralTasks() {
        #expect(ScopeSummary.label(forTaskCount: 42) == "42 tasks scoped")
    }
}
