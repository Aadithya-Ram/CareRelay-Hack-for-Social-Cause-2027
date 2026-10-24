'use client';
import {useEffect} from 'react';
export default function AdminRedirect(){useEffect(()=>{location.replace('/login?staff=1');},[]);return <main className="portal-loading"><h1>Opening admin sign in...</h1></main>;}
