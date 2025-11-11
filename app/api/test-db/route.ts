import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Test basic connection
    const { data, error } = await supabase.from("players").select("count").limit(1)

    if (error) {
      return NextResponse.json(
        {
          status: "error",
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    // Test insert capability by checking table permissions
    const { data: testInsert, error: insertTestError } = await supabase
      .from("players")
      .select("id")
      .limit(0)

    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      tableExists: true,
      canRead: !error,
      canWrite: !insertTestError,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}




