import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://lsrezvicwacdqwnkgnzo.supabase.co";
const SUPABASE_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcmV6dmljd2FjZHF3bmtnbnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTI2MTgsImV4cCI6MjEwMDIyODYxOH0.u-Q6i-2yhM-juIzWYCDvDibgz2uzk9U-4DiaWfAnVM8";
const CHECK_LEVEL_TIMEOUT = 5 * 60 * 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);

const checkRiverLevel = async () => {

    try{
        const { data, error } = await supabase.from("medicao_tb").select().order('created_at', { ascending: false }).limit(100);
        console.log(data);
    } catch (err) {
        console.error(err);
    }

}

checkRiverLevel();

setInterval(checkRiverLevel, CHECK_LEVEL_TIMEOUT);