import SwiftUI

struct PlaceholderScreen: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Asian")
                .font(.largeTitle.bold())
            Text(
                "Track 9 scope, native surface. See "
                    + "docs/knowledge/tracks/track-09-nextjs-frontend.md for what's "
                    + "specified so far; this app is scaffold only."
            )
            .font(.body)
            .multilineTextAlignment(.center)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    PlaceholderScreen()
}
