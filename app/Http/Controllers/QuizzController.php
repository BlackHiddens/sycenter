<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class QuizzController extends Controller
{

    public function show(string $id): View   {
        $quizz = Quizz::findOrFail($id);
        return view('quizz.show', compact('quizz'));
    }
    
    public function delete(string $id): RedirectResponse {
        $quizz = Quizz::findOrFail($id);
        $quizz->delete();
        return redirect()->route('Quizz');  // Rediriger vers une page appropriée
    }
    
    public function update(Request $request, string $id): RedirectResponse {
        $quizz = Quizz::findOrFail($id);
        $quizz->update($request->all());  // Assure-toi que la validation est gérée
        return redirect()->route('quizz.show', $quizz->id);
    }
    //sauvegarder les données dans la base de données
    public function store(Request $request): RedirectResponse{
            $request->validate([
                // Ajoute d'autres règles de validation selon les champs de ton formulaire
                'title' => 'required|string|max:255', 
            ]);
        
            $quizz = new Quizz();
            $quizz->title = $request->title;
        
            $quizz->save();
        
            return redirect()->route('quizz.show', $quizz->id);
        }
}
