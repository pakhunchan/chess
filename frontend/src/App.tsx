import { Button } from './components/ui/button'

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Theme Test</h1>
      <div className="flex gap-4">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-lg bg-primary" />
        <div className="w-16 h-16 rounded-lg bg-secondary" />
        <div className="w-16 h-16 rounded-lg bg-accent" />
        <div className="w-16 h-16 rounded-lg bg-destructive" />
      </div>
      <p className="text-muted-foreground">
        If the theme is working, you should see purple, teal, orange, and red.
      </p>
    </div>
  )
}

export default App
