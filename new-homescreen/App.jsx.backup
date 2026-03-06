import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { checkSupabaseTables } from './utils/checkSupabase'
import './App.css'

function App() {
  const [pantryItems, setPantryItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tableInfo, setTableInfo] = useState(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  
  // Question flow state
  const [showQuestionFlow, setShowQuestionFlow] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionAnswers, setQuestionAnswers] = useState({})

  // Check Supabase connection and tables on mount
  useEffect(() => {
    checkConnection()
    fetchPantryItems()
    fetchRecipes()
  }, [])

  const checkConnection = async () => {
    const info = await checkSupabaseTables()
    setTableInfo(info)
    if (!info.connected && info.errors.length > 0) {
      setError(`Connection issue: ${info.errors[0]}`)
    }
  }

  const fetchPantryItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try different table names
      const tableNames = ['pantry_items', 'pantry', 'items', 'pantryItems', 'ingredients']
      
      for (const tableName of tableNames) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false })

          if (!error && data !== null) {
            setPantryItems(data || [])
            setLoading(false)
            return
          }
        } catch (e) {
          continue
        }
      }
      
      // If we get here, no table worked
      setError('Could not find pantry table. Check browser console for details.')
      setPantryItems([])
    } catch (err) {
      console.error('Error fetching pantry items:', err)
      setError(err.message)
      setPantryItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchRecipes = async () => {
    try {
      const tableNames = ['recipes', 'recipe', 'recipe_list']
      
      for (const tableName of tableNames) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false })

          if (!error && data !== null) {
            setRecipes(data || [])
            return
          }
        } catch (e) {
          continue
        }
      }
      
      setRecipes([])
    } catch (err) {
      console.error('Error fetching recipes:', err)
      setRecipes([])
    }
  }

  const addPantryItem = async () => {
    if (!newItem.trim()) return

    try {
      setError(null)
      const tableNames = ['pantry_items', 'pantry', 'items', 'pantryItems', 'ingredients']
      
      for (const tableName of tableNames) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .insert([{ name: newItem.trim() }])
            .select()

          if (!error && data) {
            setPantryItems([data[0], ...pantryItems])
            setNewItem('')
            return
          }
        } catch (e) {
          continue
        }
      }
      
      setError('Could not add item. Check table structure in Supabase.')
    } catch (err) {
      console.error('Error adding item:', err)
      setError(err.message)
    }
  }

  const deletePantryItem = async (id) => {
    try {
      const tableNames = ['pantry_items', 'pantry', 'items', 'pantryItems', 'ingredients']
      
      for (const tableName of tableNames) {
        try {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)

          if (!error) {
            setPantryItems(pantryItems.filter(item => item.id !== id))
            return
          }
        } catch (e) {
          continue
        }
      }
      
      setError('Could not delete item.')
    } catch (err) {
      console.error('Error deleting item:', err)
      setError(err.message)
    }
  }

  // Question flow questions
  const questions = [
    {
      id: 'servings',
      type: 'number',
      question: 'How many people are going to be fed?',
      placeholder: 'Enter number of people (e.g., 4)',
      skippable: false // Required question
    },
    {
      id: 'mealType',
      type: 'options',
      question: 'What type of meal?',
      options: ['Hot Food', 'Cold Dishes', 'Appetizers', 'Dessert'],
      skippable: true
    },
    {
      id: 'dietary',
      type: 'text',
      question: 'Any dietary restrictions? If so, what are they?',
      placeholder: 'e.g., vegetarian, gluten-free, nut allergy, etc.',
      skippable: true
    },
    {
      id: 'time',
      type: 'options',
      question: 'How much time do you have?',
      options: ['Quick (15 min)', '30 min', '1 hour', 'Slow Cooker'],
      skippable: true
    },
    {
      id: 'cuisine',
      type: 'text',
      question: 'Cuisine preference (optional)',
      placeholder: 'e.g., Italian, Mexican, Asian, etc.',
      skippable: true
    },
    {
      id: 'budget',
      type: 'number',
      question: 'Budget (optional)',
      placeholder: 'Enter your budget in dollars',
      skippable: true
    },
    {
      id: 'pantry',
      type: 'textarea',
      question: "What's in your pantry?",
      placeholder: 'Enter your ingredients separated by commas...',
      skippable: false // Required question
    }
  ]

  const handleAnswer = (questionId, value) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // All questions answered, you can process the answers here
      console.log('All answers:', questionAnswers)
      setShowQuestionFlow(false)
      // Reset for next time
      setCurrentQuestionIndex(0)
      setQuestionAnswers({})
    }
  }

  const handleSkip = () => {
    const currentQuestion = questions[currentQuestionIndex]
    // Only allow skipping if the question is skippable
    if (currentQuestion.skippable) {
      handleNext()
    }
  }

  const handleQuestionSubmit = (e) => {
    e.preventDefault()
    const currentQuestion = questions[currentQuestionIndex]
    const answer = questionAnswers[currentQuestion.id]
    
    // For required (non-skippable) questions, must have an answer
    if (!currentQuestion.skippable) {
      if (currentQuestion.type === 'number') {
        if (!answer || answer.trim() === '' || parseInt(answer) < 1) {
          return // Don't proceed if required number question is empty or invalid
        }
      } else if (currentQuestion.type === 'text' || currentQuestion.type === 'textarea') {
        if (!answer || answer.trim() === '') {
          return // Don't proceed if required text question is empty
        }
      } else if (currentQuestion.type === 'options') {
        if (!answer) {
          return // Don't proceed if required option question has no selection
        }
      }
    }
    
    handleNext()
  }

  // Check if current question can proceed
  const canProceed = () => {
    const currentQuestion = questions[currentQuestionIndex]
    const answer = questionAnswers[currentQuestion.id]
    
    // If question is not skippable, must have valid answer
    if (!currentQuestion.skippable) {
      if (currentQuestion.type === 'number') {
        return answer && answer.trim() !== '' && parseInt(answer) >= 1
      } else if (currentQuestion.type === 'text' || currentQuestion.type === 'textarea') {
        return answer && answer.trim() !== ''
      } else if (currentQuestion.type === 'options') {
        return answer !== null && answer !== undefined
      }
    }
    
    // If skippable, can always proceed (even with no answer)
    return true
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍳 Pantry Pal</h1>
        {error && <div className="error-message">⚠️ {error}</div>}
        <button 
          className="diagnostics-btn" 
          onClick={() => setShowDiagnostics(!showDiagnostics)}
        >
          {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
        </button>
      </header>

      {showDiagnostics && tableInfo && (
        <div className="diagnostics-panel">
          <h3>Connection Status</h3>
          <p>Connected: {tableInfo.connected ? '✅ Yes' : '❌ No'}</p>
          <h3>Table Check Results:</h3>
          <ul>
            {tableInfo.tables.map((table, idx) => (
              <li key={idx}>
                <strong>{table.name}:</strong>{' '}
                {table.exists === true ? (
                  `✅ Exists (${table.rowCount} rows found)`
                ) : table.exists === false ? (
                  '❌ Does not exist'
                ) : (
                  `⚠️ ${table.error || 'Unknown'}`
                )}
              </li>
            ))}
          </ul>
          <p className="help-text">
            💡 <strong>To restore your data:</strong> Go to Supabase → Table Editor and tell me the exact table names you see.
          </p>
        </div>
      )}
      
      {showQuestionFlow && (
        <div className="question-flow-overlay">
          <div className="question-flow-container">
            <div className="question-card" key={currentQuestionIndex}>
              <h2 className="question-title">
                {questions[currentQuestionIndex].question}
              </h2>
              
              <form onSubmit={handleQuestionSubmit} className="question-form">
                {questions[currentQuestionIndex].type === 'number' && (
                  <input
                    type="number"
                    className="question-input"
                    placeholder={questions[currentQuestionIndex].placeholder}
                    value={questionAnswers[questions[currentQuestionIndex].id] || ''}
                    onChange={(e) => handleAnswer(questions[currentQuestionIndex].id, e.target.value)}
                    min="1"
                    autoFocus
                  />
                )}
                
                {questions[currentQuestionIndex].type === 'text' && (
                  <input
                    type="text"
                    className="question-input"
                    placeholder={questions[currentQuestionIndex].placeholder}
                    value={questionAnswers[questions[currentQuestionIndex].id] || ''}
                    onChange={(e) => handleAnswer(questions[currentQuestionIndex].id, e.target.value)}
                    autoFocus
                  />
                )}
                
                {questions[currentQuestionIndex].type === 'textarea' && (
                  <textarea
                    className="question-textarea"
                    placeholder={questions[currentQuestionIndex].placeholder}
                    value={questionAnswers[questions[currentQuestionIndex].id] || ''}
                    onChange={(e) => handleAnswer(questions[currentQuestionIndex].id, e.target.value)}
                    rows="4"
                    autoFocus
                  />
                )}
                
                {questions[currentQuestionIndex].type === 'options' && (
                  <div className="question-options">
                    {questions[currentQuestionIndex].options.map((option, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`question-option-btn ${
                          questionAnswers[questions[currentQuestionIndex].id] === option ? 'selected' : ''
                        }`}
                        onClick={() => handleAnswer(questions[currentQuestionIndex].id, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="question-actions">
                  {questions[currentQuestionIndex].skippable && (
                    <button
                      type="button"
                      className="skip-btn"
                      onClick={handleSkip}
                    >
                      Skip
                    </button>
                  )}
                  <button
                    type="submit"
                    className="next-btn"
                    disabled={!canProceed()}
                  >
                    {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
                  </button>
                </div>
              </form>
              
              <div className="question-progress">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="app-main homescreen-split">
        {!showQuestionFlow && (
          <>
            <section className="homescreen-left">
              <div className="pantry-pal-intro">
                <h2 className="intro-title">🍳 Pantry Pal</h2>
                <p className="intro-tagline">Transforming your pantry into a delicious meal</p>
                <button
                  className="start-question-flow-btn"
                  onClick={() => setShowQuestionFlow(true)}
                >
                  Start Recipe Generator
                </button>
                <div className="pantry-quick-add">
                  <h3>My Pantry</h3>
                  <div className="add-item">
                    <input
                      type="text"
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addPantryItem()}
                      placeholder="Add item..."
                      disabled={loading}
                    />
                    <button onClick={addPantryItem} disabled={loading}>
                      {loading ? '...' : 'Add'}
                    </button>
                  </div>
                  {loading && pantryItems.length === 0 ? (
                    <div className="loading">Loading...</div>
                  ) : (
                    <ul className="pantry-list">
                      {pantryItems.length === 0 ? (
                        <li className="empty">No items yet</li>
                      ) : (
                        pantryItems.slice(0, 5).map(item => (
                          <li key={item.id}>
                            <span>{item.name || item.item_name || item.ingredient || JSON.stringify(item)}</span>
                            <button 
                              className="delete-btn" 
                              onClick={() => deletePantryItem(item.id)}
                              title="Delete"
                            >
                              ×
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                  {pantryItems.length > 5 && (
                    <p className="pantry-more">+{pantryItems.length - 5} more items</p>
                  )}
                </div>
              </div>
            </section>

            <section className="homescreen-right">
              <h2 className="recipe-examples-title">Recipe Examples</h2>
              <p className="recipe-examples-subtitle">Here's what Pantry Pal can create for you</p>
              <div className="recipe-examples-grid">
                {[
                  { img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', name: 'Fresh Garden Salad' },
                  { img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', name: 'Homemade Pizza' },
                  { img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', name: 'Fluffy Pancakes' },
                  { img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', name: 'Creamy Pasta' },
                  { img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400', name: 'Gourmet Burger' },
                  { img: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400', name: 'Veggie Bowl' }
                ].map((recipe, idx) => (
                  <div key={idx} className="recipe-example-card">
                    <div className="recipe-example-image">
                      <img src={recipe.img} alt={recipe.name} />
                    </div>
                    <span className="recipe-example-name">{recipe.name}</span>
                  </div>
                ))}
              </div>
              {recipes.length > 0 && (
                <div className="your-recipes-section">
                  <h3>Your Recipes</h3>
                  <ul className="recipes-list">
                    {recipes.map(recipe => (
                      <li key={recipe.id} className="recipe-item">
                        <h4>{recipe.name || recipe.title || recipe.recipe_name || 'Untitled Recipe'}</h4>
                        {recipe.description && <p>{recipe.description}</p>}
                        {recipe.ingredients && (
                          <div className="recipe-ingredients">
                            <strong>Ingredients:</strong> {recipe.ingredients}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
